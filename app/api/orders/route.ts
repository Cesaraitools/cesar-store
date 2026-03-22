// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function resolveUser(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user;
    }
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch { return null; }
}

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `CS-${timestamp}${random}`;
}

export async function POST(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { currency = "EGP", customer, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const order_id = crypto.randomUUID();
    const order_number = generateOrderNumber();
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    /* 1. إدخال الطلب الرئيسي */
    const { error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        id: order_id,
        order_number,
        status: "requested",
        subtotal,
        total: subtotal,
        currency,
        customer_snapshot: customer,
        items_snapshot: items,
        user_id: user.id,
      });

    if (orderError) {
        console.error("Order Insert Error:", orderError);
        throw new Error(orderError.message);
    }

    /* 2. إدخال المنتجات (التعديل الهام هنا) */
    const itemsToInsert = items.map((item) => ({
      order_id: order_id,
      product_id: String(item.product_id || item.id),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || null
    }));

    // نستخدم await هنا للتأكد من انتهاء العملية
    const { error: itemsError } = await serviceSupabase
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      // طباعة تفصيلية جداً للخطأ في الـ Terminal
      console.error("CRITICAL: Failed to insert into order_items!");
      console.error("Error Details:", itemsError);
      // في حالة فشل إدراج الأصناف، يفضل إرجاع خطأ للعميل ليعيد المحاولة
      return NextResponse.json({ 
        error: "Failed to save order items", 
        details: itemsError.message 
      }, { status: 500 });
    }

    /* 3. سجل التتبع */
    await serviceSupabase.from("order_tracking_events").insert([
      { order_id: order_id, status: "requested", actor: "system" },
    ]);

    return NextResponse.json({ success: true, orderId: order_id, order_number });

  } catch (error: any) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}