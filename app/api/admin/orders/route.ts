// =====================================================
// Admin Orders API (Optimized & Secure)
// Cesar Store
// Path: /app/api/admin/orders/route.ts
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    /* 🔒 Security */
    if (!validateAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------- Params -------- */
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 100);

    /* -------- Orders -------- */
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        total,
        currency,
        created_at,
        customer_snapshot
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Orders Fetch Error:", error);
      return NextResponse.json(
        { error: "Failed to load orders" },
        { status: 500 }
      );
    }

    const orderIds = (orders || []).map(o => o.id);

    /* -------- Tracking (Batch) -------- */
    const { data: tracking } = await supabase
      .from("order_tracking_events")
      .select("order_id, status, created_at")
      .in("order_id", orderIds);

    /* -------- Build Map -------- */
    const latestStatusMap: Record<string, string> = {};

    tracking?.forEach((t) => {
      const existing = latestStatusMap[t.order_id];

      if (!existing) {
        latestStatusMap[t.order_id] = t.status;
      } else {
        // compare timestamps
        const current = tracking
          .filter(x => x.order_id === t.order_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        latestStatusMap[t.order_id] = current.status;
      }
    });

    /* -------- Final Shape -------- */
    const result = (orders || []).map((o) => ({
      id: o.id,
      total: o.total,
      currency: o.currency,
      created_at: o.created_at,
      customer_snapshot: o.customer_snapshot,
      status: latestStatusMap[o.id] || "requested",
    }));

    return NextResponse.json({ orders: result });

  } catch (err) {
    console.error("Admin Orders API Crash:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}