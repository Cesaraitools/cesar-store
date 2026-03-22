// app/api/admin/orders/[orderId]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function validateAdminSession() {
  const cookieStore = cookies();
  const session = cookieStore.get("cesar_admin_session");

  if (!session) return false;

  // هنا تقدر تضيف signature validation لو حابب
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
      process.env.SUPABASE_SERVICE_ROLE_KEY! // مهم
    );

    const { orderId } = params;

    // 1. جلب الطلب
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 2. جلب tracking
    const { data: tracking } = await supabase
      .from("order_tracking_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      order: {
        ...order,
        items: order.items_snapshot,
        tracking: tracking || [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}