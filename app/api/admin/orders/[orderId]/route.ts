// =====================================================
// Admin Order Details API (Secure & Clean)
// Cesar Store
// Path: /app/api/admin/orders/[orderId]/route.ts
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    /* 🔒 Security */
    if (!validateAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = params;

    /* -------- Order -------- */
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
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
      name: item?.name || "—",
      price: Number(item?.price || 0),
      quantity: Number(item?.quantity || 0),
    }));

    /* -------- Tracking -------- */
    const { data: tracking } = await supabase
      .from("order_tracking_events")
      .select("status, created_at, actor")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    /* -------- Latest Status -------- */
    const latestStatus =
      tracking && tracking.length
        ? tracking[tracking.length - 1].status
        : "requested";

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