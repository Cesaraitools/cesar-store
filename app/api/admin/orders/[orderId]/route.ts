// =====================================================
// Admin Order Details API (Secure & Clean)
// Cesar Store
// Path: /app/api/admin/orders/[orderId]/route.ts
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/admin/permissions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATUS_RANK: Record<string, number> = {
  requested: 1,
  confirmed: 2,
  preparing: 3,
  shipped: 4,
  delivered: 5,
  canceled: 6,
};

function resolveOrderStatus(orderStatus?: string | null, trackingStatus?: string | null) {
  if (orderStatus === "canceled" || trackingStatus === "canceled") {
    return "canceled";
  }

  const orderRank = STATUS_RANK[orderStatus || ""] ?? 0;
  const trackingRank = STATUS_RANK[trackingStatus || ""] ?? 0;

  if (orderRank >= trackingRank && orderStatus) {
    return orderStatus;
  }

  return trackingStatus || orderStatus || "requested";
}

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    /* 🔒 Security */
    const guard = await requireAdminRole(["full", "orders"]);
    if (guard.response) return guard.response;

    const { orderId } = params;

    /* -------- Order -------- */
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total,
        currency,
        created_at,
        customer_snapshot,
        items_snapshot
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    /* -------- Safe Items -------- */
    const items = (order.items_snapshot || []).map((item: any) => ({
      name:
  item?.name ||
  item?.name_ar ||
  item?.name_en ||
  item?.product?.name_ar ||
  item?.product?.name_en ||
  item?.product?.name ||
  "—",
      price: Number(item?.price || 0),
      quantity: Number(item?.quantity || 0),
      variant: item?.variant || null,
    }));

    /* -------- Tracking -------- */
    const { data: tracking } = await supabase
      .from("order_tracking_events")
      .select("status, created_at, actor")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    /* -------- Latest Status -------- */
    const latestStatus =
      resolveOrderStatus(
        order.status,
        tracking && tracking.length ? tracking[tracking.length - 1].status : null
      );

    return NextResponse.json({
      order: {
        id: order.id,
        total: order.total,
        currency: order.currency,
        created_at: order.created_at,
        customer_snapshot: order.customer_snapshot,
        items,
        tracking: tracking || [],
        status: latestStatus,
      },
    });

  } catch (err: any) {
    console.error("Admin Order Details Crash:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
