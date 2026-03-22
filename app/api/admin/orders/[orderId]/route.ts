import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function validateAdminSession() {
  const cookieStore = cookies();
  const session = cookieStore.get("cesar_admin_session");

  if (!session) return false;

  return true;
}

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    // 🔐 حماية الأدمن
    if (!validateAdminSession()) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { orderId } = params;

    // ✅ FIX: maybeSingle بدل single
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("ORDER FETCH ERROR:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // ✅ حماية إضافية
    const items = Array.isArray(order.items_snapshot)
      ? order.items_snapshot
      : [];

    // tracking
    const { data: tracking, error: trackingError } = await supabase
      .from("order_tracking_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (trackingError) {
      console.error("TRACKING ERROR:", trackingError);
    }

    return NextResponse.json({
      order: {
        ...order,
        items,
        tracking: tracking || [],
      },
    });
  } catch (err: any) {
    console.error("🔥 API CRASH:", err);

    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}