import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackingStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

type OrderRow = {
  id: string;
  items_snapshot: any[];
};

type TrackingEventRow = {
  id: string;
  order_id: string;
  status: TrackingStatus;
  created_at: string;
  actor: string | null;
  note: string | null;
};

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

const supabase = createServiceRoleClient();

/* 🔐 NEW: Validate Reset Secret */
function validateResetSecret(request: Request) {
  const secret = request.headers.get("x-reset-secret");
  return secret && secret === process.env.RESET_SECRET;
}

function extractOrderItems(itemsSnapshot: any[]): OrderSnapshotItem[] {
  const merged = new Map<string, OrderSnapshotItem>();

  for (const item of itemsSnapshot || []) {
    const productId = String(item?.product_id || "");
    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));

    if (!productId || quantity <= 0) {
      continue;
    }

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

function buildLatestStatusMap(
  orders: OrderRow[],
  trackingEvents: TrackingEventRow[]
) {
  const latestStatusMap = new Map<string, TrackingStatus>();

  for (const order of orders) {
    latestStatusMap.set(order.id, "requested");
  }

  for (const event of trackingEvents) {
    latestStatusMap.set(event.order_id, event.status);
  }

  return latestStatusMap;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();

  return (
    error?.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    details.includes("does not exist")
  );
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

async function deleteOptionalOrderDependencies(orderIds: string[]) {
  for (const tableName of ["order_items", "invoices"]) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in("order_id", orderIds);

    if (error && !isMissingTableError(error)) {
      throw new Error(`Failed to delete ${tableName}`);
    }
  }
}

export async function POST(request: Request) {
  const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 3, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
console.log("RESET START", {
  ip,
  time: new Date().toISOString(),
});
  try {
    /* 🔐 NEW: Secret check */
    if (!(await validateAdminSession())) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}   

const supabase = createServerClient();

const {
  data: { user },
} = await supabase.auth.getUser();

if (!user || user.email !== process.env.SUPER_ADMIN_EMAIL) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
console.log("RESET AUTHORIZED", {
  userId: user?.id,
  email: user?.email,
});
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, items_snapshot");

    if (ordersError) {
      throw ordersError;
    }

    const safeOrders = (orders || []) as OrderRow[];

    if (!safeOrders.length) {
      console.log("RESET SUCCESS", {
  deletedOrders: safeOrders.length,
});
      return NextResponse.json({
        ok: true,
        deletedOrders: 0,
        deletedTrackingEvents: 0,
        restoredProducts: 0,
        restoredUnits: 0,
      });
    }

    const orderIds = safeOrders.map((order) => order.id);

    const { data: trackingEvents, error: trackingError } = await supabase
      .from("order_tracking_events")
      .select("id, order_id, status, created_at, actor, note")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (trackingError) {
      throw trackingError;
    }

    const safeTrackingEvents = (trackingEvents || []) as TrackingEventRow[];
    const latestStatusMap = buildLatestStatusMap(safeOrders, safeTrackingEvents);

    const restoreMap = new Map<string, number>();

    for (const order of safeOrders) {
      if (latestStatusMap.get(order.id) === "canceled") {
        continue;
      }

      for (const item of extractOrderItems(order.items_snapshot || [])) {
        restoreMap.set(
          item.product_id,
          (restoreMap.get(item.product_id) || 0) + item.quantity
        );
      }
    }

    const appliedInventoryUpdates: InventoryUpdate[] = [];

    try {
      for (const [productId, quantity] of restoreMap.entries()) {
        try {
          const update = await restoreProductInventory(productId, quantity);
          appliedInventoryUpdates.push(update);
        } catch {
          console.warn("Skip restoring product:", productId);
          continue;
        }
      }
    } catch (error) {
      await rollbackInventory(appliedInventoryUpdates);

      return NextResponse.json(
        { error: "Failed to restore inventory before reset" },
        { status: 500 }
      );
    }

    let deleteOrdersError: any = null;

    const firstDeleteOrdersResult = await supabase
      .from("orders")
      .delete()
      .in("id", orderIds);

    deleteOrdersError = firstDeleteOrdersResult.error;

    if (deleteOrdersError) {
      try {
        await deleteOptionalOrderDependencies(orderIds);

        const retryDeleteOrdersResult = await supabase
          .from("orders")
          .delete()
          .in("id", orderIds);

        deleteOrdersError = retryDeleteOrdersResult.error;
      } catch (dependencyError) {
        deleteOrdersError = dependencyError;
      }
    }

    if (deleteOrdersError) {
      const { error: restoreTrackingError } = safeTrackingEvents.length
        ? await supabase.from("order_tracking_events").insert(
            safeTrackingEvents.map((event) => ({
              id: event.id,
              order_id: event.order_id,
              status: event.status,
              created_at: event.created_at,
              actor: event.actor,
              note: event.note,
            }))
          )
        : { error: null };

      await rollbackInventory(appliedInventoryUpdates);

      return NextResponse.json(
        {
          error: "Failed to delete test orders",
          details:
            restoreTrackingError?.message ||
            deleteOrdersError?.message ||
            "Unknown delete failure",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      deletedOrders: safeOrders.length,
      deletedTrackingEvents: safeTrackingEvents.length,
      restoredProducts: restoreMap.size,
      restoredUnits: Array.from(restoreMap.values()).reduce(
        (sum, quantity) => sum + quantity,
        0
      ),
    });
  } catch (error: any) {
    console.error("RESET FAILED", {
  error,
});
    return NextResponse.json(
      {
        error: "Failed to reset analytics data",
        details: error.message ?? error,
      },
      { status: 500 }
    );
  }
}