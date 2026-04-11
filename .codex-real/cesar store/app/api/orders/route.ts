// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
export const dynamic = "force-dynamic";
/* ================= Order Number ================= */

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `CS-${timestamp}${random}`;
}

/* ================= GET Orders ================= */

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const serviceSupabase = createServiceRoleClient();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await serviceSupabase
      .from("orders")
      .select("id, order_number, created_at, status, total, currency")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to load orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= POST Create Order ================= */

export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const serviceSupabase = createServiceRoleClient();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currency = "EGP", customer, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    /* ================= Duplicate Order Protection ================= */

    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    const { data: recentOrder } = await serviceSupabase
      .from("orders")
      .select("id, order_number")
      .eq("user_id", user.id)
      .gte("created_at", tenSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOrder) {
      return NextResponse.json({
        success: true,
        reused: true,
        orderId: recentOrder.id,
        order_number: recentOrder.order_number,
      });
    }

    /* ================= Build Order ================= */

    const id = crypto.randomUUID();

    const items_snapshot: any[] = [];

    for (const item of items) {
      items_snapshot.push({
        product_id: String(item.product_id),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image ?? null,
      });
    }

    const subtotal = items_snapshot.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const customer_snapshot = {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
    };

    const order_number = generateOrderNumber();

    /* -------- INSERT ORDER -------- */

    const { error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        id,
        order_number,
        status: "requested", // 🔥 FIX
        subtotal,
        total: subtotal,
        currency,
        customer_snapshot,
        items_snapshot,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });

    if (orderError) {
      console.error("ORDER INSERT ERROR:", orderError);

      return NextResponse.json(
        { error: "Order creation failed", details: orderError.message },
        { status: 500 }
      );
    }

    console.log("ORDER CREATED:", id);

    /* -------- TRACKING EVENTS -------- */

    await serviceSupabase.from("order_tracking_events").insert([
      { order_id: id, status: "requested", actor: "system" },
      // ❌ حذف confirmed من البداية
    ]);

    return NextResponse.json({
      success: true,
      orderId: id,
      order_number,
    });

  } catch (error) {
    console.error("Unexpected POST error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
