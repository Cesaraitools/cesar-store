import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { requireAdminRole } from "@/lib/admin/permissions";
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
  variant_key?: string;
};

type ProductStockRow = {
  id: string;
  stock: number;
  is_active: boolean;
  variants_json?: any[];
};

type InventoryUpdate = {
  id: string;
  previousStock: number;
  previousActive: boolean;
  previousVariants: any[];
  nextStock: number;
  nextActive: boolean;
  nextVariants: any[];
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

const STATUS_RANK: Record<TrackingStatus, number> = {
  requested: 1,
  confirmed: 2,
  preparing: 3,
  shipped: 4,
  delivered: 5,
  canceled: 6,
};

function resolveOrderStatus(
  orderStatus?: string | null,
  trackingStatus?: string | null
): TrackingStatus {
  if (orderStatus === "canceled" || trackingStatus === "canceled") {
    return "canceled";
  }

  const safeOrderStatus = VALID_STATUSES.includes(orderStatus as TrackingStatus)
    ? (orderStatus as TrackingStatus)
    : null;
  const safeTrackingStatus = VALID_STATUSES.includes(trackingStatus as TrackingStatus)
    ? (trackingStatus as TrackingStatus)
    : null;

  const orderRank = safeOrderStatus ? STATUS_RANK[safeOrderStatus] : 0;
  const trackingRank = safeTrackingStatus ? STATUS_RANK[safeTrackingStatus] : 0;

  if (orderRank >= trackingRank && safeOrderStatus) {
    return safeOrderStatus;
  }

  return safeTrackingStatus || safeOrderStatus || "requested";
}

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
  const [{ data: order }, { data }] = await Promise.all([
    supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
    .from("order_tracking_events")
    .select("status")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return resolveOrderStatus(order?.status, data?.[0]?.status);
}

function extractOrderItems(itemsSnapshot: any[]): OrderSnapshotItem[] {
  const merged = new Map<string, OrderSnapshotItem>();

  for (const item of itemsSnapshot || []) {
    const productId = String(item?.product_id || "");
    const variantKey = String(item?.variant_key || item?.variant?.key || "");
    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));

    if (!productId || quantity <= 0) continue;

    const itemKey = `${productId}::${variantKey}`;
    const existing = merged.get(itemKey);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    merged.set(itemKey, {
      product_id: productId,
      quantity,
      variant_key: variantKey,
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
        variants_json: update.previousVariants,
      })
      .eq("id", update.id);
  }
}

async function restoreProductInventory(
  productId: string,
  quantity: number,
  variantKey?: string
): Promise<InventoryUpdate> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, stock, is_active, variants_json")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      throw new Error("Failed to load product inventory");
    }

    if (!product) {
  console.warn(
    `Skipping inventory restore: product ${productId} not found`
  );

  return {
    id: productId,
    previousStock: 0,
    previousActive: false,
    previousVariants: [],
    nextStock: 0,
    nextActive: false,
    nextVariants: [],
  };
}

    const currentProduct: ProductStockRow = {
      id: String(product.id),
      stock: Number(product.stock ?? 0),
      is_active: Boolean(product.is_active),
      variants_json: Array.isArray(product.variants_json)
        ? product.variants_json
        : [],
    };

    const nextStock = currentProduct.stock + quantity;
    const nextActive = nextStock > 0;
    let nextVariants = currentProduct.variants_json;

    if (variantKey && currentProduct.variants_json?.length) {
      nextVariants = currentProduct.variants_json.map((variant) => {
        const key = String(variant?.key || variant?.id || "");
        if (key !== variantKey || typeof variant?.stock !== "number") {
          return variant;
        }

        return {
          ...variant,
          stock: Math.max(0, Math.floor(Number(variant.stock) || 0)) + quantity,
          active: variant.active === false ? nextActive : variant.active,
        };
      });
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update({
        stock: nextStock,
        is_active: nextActive,
        variants_json: nextVariants,
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
        previousVariants: currentProduct.variants_json || [],
        nextStock,
        nextActive,
        nextVariants,
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
        item.quantity,
        item.variant_key
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
    const guard = await requireAdminRole(["full", "orders"]);
    if (guard.response) return guard.response;

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
