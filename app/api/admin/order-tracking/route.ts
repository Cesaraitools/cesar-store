import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import * as Sentry from "@sentry/nextjs";
export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RATE_LIMIT_WINDOW = 10 * 1000;
const RATE_LIMIT_MAX = 10;

const ipStore = new Map<string, number[]>();

type TrackingStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

type OrderSnapshotItem = {
  product_id: string;
  quantity: number;
};

type ProductStockRow = {
  id: string;
  stock: number;
  is_active: boolean;
};

type InventoryUpdate = {
  id: string;
  previousStock: number;
  previousActive: boolean;
  nextStock: number;
  nextActive: boolean;
};

const VALID_STATUSES: TrackingStatus[] = [
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
];

const ALLOWED_TRANSITIONS: Record<TrackingStatus, TrackingStatus[]> = {
  requested: ["confirmed", "canceled"],
  confirmed: ["preparing", "canceled"],
  preparing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

function isRateLimited(ip: string) {
  const now = Date.now();
  const timestamps = ipStore.get(ip) || [];
  const filtered = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (filtered.length >= RATE_LIMIT_MAX) {
    return true;
  }

  filtered.push(now);
  ipStore.set(ip, filtered);
  return false;
}

async function getCurrentStatus(orderId: string): Promise<TrackingStatus> {
  const { data } = await supabase
    .from("order_tracking_events")
    .select("status")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return "requested";
  return data[0].status as TrackingStatus;
}

function extractOrderItems(itemsSnapshot: any[]): OrderSnapshotItem[] {
  const merged = new Map<string, OrderSnapshotItem>();

  for (const item of itemsSnapshot || []) {
    const productId = String(item?.product_id || "");
    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));

    if (!productId || quantity <= 0) continue;

    const existing = merged.get(productId);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    merged.set(productId, {
      product_id: productId,
      quantity,
    });
  }

  return Array.from(merged.values());
}

async function rollbackInventory(updates: InventoryUpdate[]) {
  for (const update of [...updates].reverse()) {
    await supabase
      .from("products")
      .update({
        stock: update.previousStock,
        is_active: update.previousActive,
      })
      .eq("id", update.id);
  }
}

async function restoreProductInventory(
  productId: string,
  quantity: number
): Promise<InventoryUpdate> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, stock, is_active")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      throw new Error("Failed to load product inventory");
    }

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const currentProduct: ProductStockRow = {
      id: String(product.id),
      stock: Number(product.stock ?? 0),
      is_active: Boolean(product.is_active),
    };

    const nextStock = currentProduct.stock + quantity;
    const nextActive = nextStock > 0;

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update({
        stock: nextStock,
        is_active: nextActive,
      })
      .eq("id", currentProduct.id)
      .eq("stock", currentProduct.stock)
      .eq("is_active", currentProduct.is_active)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error("Failed to restore product inventory");
    }

    if (updatedProduct) {
      return {
        id: currentProduct.id,
        previousStock: currentProduct.stock,
        previousActive: currentProduct.is_active,
        nextStock,
        nextActive,
      };
    }
  }

  throw new Error("Inventory changed while restoring stock");
}

async function restoreOrderInventory(items: OrderSnapshotItem[]) {
  const appliedUpdates: InventoryUpdate[] = [];

  try {
    for (const item of items) {
      const update = await restoreProductInventory(
        item.product_id,
        item.quantity
      );
      appliedUpdates.push(update);
    }

    return appliedUpdates;
  } catch (error) {
    await rollbackInventory(appliedUpdates);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await validateAdminSession())) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { orderId, event } = body as {
      orderId?: unknown;
      event?: unknown;
    };

    if (
      typeof orderId !== "string" ||
      orderId.length < 10 ||
      typeof event !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload format" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(event as TrackingStatus)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    const safeEvent = event as TrackingStatus;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, items_snapshot")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const currentStatus = await getCurrentStatus(orderId);

    if (currentStatus === safeEvent) {
      return NextResponse.json(
        { ok: false, error: "Already in this status" },
        { status: 400 }
      );
    }

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(safeEvent)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid transition: ${currentStatus} → ${safeEvent}`,
        },
        { status: 400 }
      );
    }

    let appliedInventoryUpdates: InventoryUpdate[] = [];

    if (safeEvent === "canceled") {
      try {
        const orderItems = extractOrderItems(order.items_snapshot ?? []);
        appliedInventoryUpdates = await restoreOrderInventory(orderItems);
      } catch (error) {
        Sentry.captureException(error);

console.error("INVENTORY RESTORE ERROR:", error);
        return NextResponse.json(
          { ok: false, error: "Failed to restore inventory for canceled order" },
          { status: 500 }
        );
      }
    }

    const trackingEventId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from("order_tracking_events")
      .insert({
        id: trackingEventId,
        order_id: orderId,
        status: safeEvent,
        actor: "admin",
      });

    if (insertError) {
  Sentry.captureException(insertError);

  console.error(insertError);
      await rollbackInventory(appliedInventoryUpdates);
      return NextResponse.json(
        { ok: false, error: "Failed to save tracking event" },
        { status: 500 }
      );
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: safeEvent })
      .eq("id", orderId)
      .select("id, status")
      .single();

    if (updateError) {
  Sentry.captureException(updateError);

  console.error(updateError);
      await supabase
        .from("order_tracking_events")
        .delete()
        .eq("id", trackingEventId);
      await rollbackInventory(appliedInventoryUpdates);

      return NextResponse.json(
        { ok: false, error: "Failed to update order status" },
        { status: 500 }
      );
    }

    console.log("AUDIT:", {
      orderId,
      from: currentStatus,
      to: safeEvent,
      restoredInventory: safeEvent === "canceled",
      ip,
      time: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      orderId,
      previousStatus: currentStatus,
      currentStatus: updatedOrder.status,
      restoredInventory: safeEvent === "canceled",
    });
  } catch (err) {
  Sentry.captureException(err);

  console.error(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
