// app/api/orders/route.ts - FIXED WITHOUT BREAKING LOGIC

import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import { cartService } from "@/lib/services/cartService";

export const dynamic = "force-dynamic";

/* ===============================
   Generate unique order number
=============================== */

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `CS-${timestamp}${random}`;
}

/* ===============================
   GET - Get user's orders
=============================== */

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    /* ===== Load Orders (ORIGINAL STRUCTURE) ===== */

    const { data: orders, error } = await serviceSupabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        created_at,
        status,
        total,
        currency,
        subtotal,
        shipping_fee,
        discount,
        customer_snapshot
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET orders error:", error);
      return NextResponse.json(
        { error: "Failed to load orders" },
        { status: 500 }
      );
    }

    /* ===== FIX: Sync Status from Events ===== */

    const orderIds = (orders ?? []).map((o) => o.id);

    let statusMap = new Map<string, string>();

    if (orderIds.length > 0) {
      const { data: events } = await serviceSupabase
        .from("order_tracking_events")
        .select("order_id, status, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      for (const event of events ?? []) {
        statusMap.set(event.order_id, event.status);
      }
    }

    /* ===== Merge WITHOUT BREAKING ANY FIELD ===== */

    const result = (orders ?? []).map((order) => ({
      ...order,
      status: statusMap.get(order.id) || order.status || "requested",
    }));

    return NextResponse.json({
      success: true,
      count: result.length,
      orders: result,
    });

  } catch (err: any) {
    console.error("GET /api/orders unexpected error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

/* ===============================
   POST - Create new order
   =============================== */

export async function POST(request: Request) {
  try {
    /* ===== User Authentication ===== */

    const user = await resolveRequestUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    /* ===== Request Validation ===== */

    const body = await request.json();

    const {
      cart_id,
      currency = "EGP",
      customer,
      items,
      shipping_fee = 0,
      discount = 0,
    } = body;

    // التحقق من البيانات المطلوبة
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload: items must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return NextResponse.json(
        { error: "Invalid customer data" },
        { status: 400 }
      );
    }

    // التحقق من صحة عناصر الطلب
    for (const item of items) {
      if (!item.product_id || !item.name || !item.price || !item.quantity) {
        return NextResponse.json(
          { error: "Invalid item data" },
          { status: 400 }
        );
      }

      if (item.price <= 0 || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Price and quantity must be positive" },
          { status: 400 }
        );
      }
    }

    /* ================= Duplicate Order Protection ================= */

    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    const { data: recentOrder } = await serviceSupabase
      .from("orders")
      .select("id, order_number, status")
      .eq("user_id", user.id)
      .gte("created_at", tenSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // إذا كان هناك طلب مشابه حديثاً، أعد نفس الرد
    if (recentOrder) {
      console.log(
        `Duplicate order detected for user ${user.id}, reusing order ${recentOrder.id}`
      );

      return NextResponse.json(
        {
          success: true,
          reused: true,
          orderId: recentOrder.id,
          order_number: recentOrder.order_number,
          message: "Duplicate order detected. Using recent order.",
        },
        { status: 200 }
      );
    }

    /* ================= Build Order Payload ================= */

    const orderId = crypto.randomUUID();

    // بناء items_snapshot مع جميع التفاصيل
    const items_snapshot = items.map((item: any) => ({
      product_id: String(item.product_id),
      name: String(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity),
      image: item.image ?? null,
    }));

    // حساب الإجمالي
    const subtotal = items_snapshot.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    const total = subtotal + Number(shipping_fee) - Number(discount);

    // بناء customer_snapshot
    const customer_snapshot = {
      name: String(customer.name),
      phone: String(customer.phone),
      address: String(customer.address),
      city: customer.city ? String(customer.city) : null,
      notes: customer.notes ? String(customer.notes) : null,
    };

    // توليد رقم الطلب
    const order_number = generateOrderNumber();

    console.log(
      `Creating order for user ${user.id}: ${order_number} with ${items.length} items`
    );

    /* ===== INSERT ORDER ===== */

    const { error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        id: orderId,
        user_id: user.id,
        order_number,
        status: "requested", // الحالة الأولية
        subtotal,
        shipping_fee: Number(shipping_fee),
        discount: Number(discount),
        total,
        currency,
        customer_snapshot,
        items_snapshot,
        created_at: new Date().toISOString(),
      });

    if (orderError) {
      console.error("ORDER INSERT ERROR:", orderError);

      return NextResponse.json(
        {
          error: "Order creation failed",
          details: orderError.message,
        },
        { status: 500 }
      );
    }

    console.log(`✅ ORDER CREATED: ${orderId} (${order_number})`);

    /* ===== INSERT TRACKING EVENT ===== */

    const { error: trackingError } = await serviceSupabase
      .from("order_tracking_events")
      .insert([
        {
          order_id: orderId,
          status: "requested",
          actor: "customer",
          note: "تم إنشاء الطلب",
        },
      ]);

    if (trackingError) {
      console.warn("Failed to create tracking event:", trackingError);
      // لا نرجع error، لأن الطلب نُشئ بنجاح
    }

    /* ===== CLEAR CART (اختياري) ===== */

    if (cart_id) {
      try {
        await cartService.clearCart(cart_id);
        console.log(`Cart ${cart_id} cleared after order creation`);

        // تحديث حالة السلة
        await serviceSupabase
          .from("carts")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", cart_id);
      } catch (cartError) {
        console.warn("Failed to clear cart:", cartError);
        // لا نرجع error، الطلب نجح
      }
    }

    /* ===== RESPONSE ===== */

    return NextResponse.json(
      {
        success: true,
        reused: false,
        orderId,
        order_number,
        message: "Order created successfully",
        order: {
          id: orderId,
          order_number,
          status: "requested",
          total,
          currency,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/orders unexpected error:", error);

    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      },
      { status: 500 }
    );
  }
}