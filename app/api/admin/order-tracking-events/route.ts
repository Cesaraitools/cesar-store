import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ NEW
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

// ✅ Prevent static optimization
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 🔒 NEW: UNIFIED ADMIN AUTH
    if (!validateAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Safe ENV + Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase ENV");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /* -------- Params -------- */

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    /* -------- Load Events -------- */

    const { data, error } = await supabase
      .from("order_tracking_events")
      .select("status, created_at, actor")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to load tracking events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId,
      events: data || [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}