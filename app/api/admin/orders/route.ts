import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ NEW
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

// ✅ Prevent static optimization
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    /* 🔒 NEW: SECURE VALIDATION */
    if (!validateAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------- Supabase -------- */

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase ENV");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /* -------- Load Orders -------- */

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 100);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total,
        currency,
        created_at,
        customer_snapshot,
        order_tracking_events (
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to load orders" },
        { status: 500 }
      );
    }

    const orders = data.map((order) => {
      const events = order.order_tracking_events || [];
      const latest =
        events.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0] || null;

      return {
        id: order.id,
        total: order.total,
        currency: order.currency,
        created_at: order.created_at,
        customer_snapshot: order.customer_snapshot,
        status: latest?.status || "requested",
      };
    });

    return NextResponse.json({
      ok: true,
      orders,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}