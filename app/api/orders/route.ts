// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/* ================= Service Role Client ================= */
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ================= Resolve User ================= */
async function resolveUser(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user;
    }
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/* ================= Order Number ================= */
function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `CS-${timestamp}${random}`;
}

/* ================= GET Orders ================= */
export async function GET(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await serviceSupabase
      .from("orders")
      .select("id, order_number, created_at, status, total, currency")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= POST Create Order ================= */
export async function POST(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { currency = "EGP", customer, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
    }

    /* ================= Duplicate Order Protection ================= */
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recentOrder } = await serviceSupabase
      .from("orders")
      .select("id, order_number")
      .eq("user_id", user.id)
      .gte("created_at", tenSecondsAgo)
      .maybeSingle();

    if (recentOrder) {
      return NextResponse.json({
        success: true,
        reused: true,
        orderId: recentOrder.id,
        order_number: recentOrder.order_number,
      });
    }

    /* ================= Build Order Data ================= */
    const order_id = crypto.randomUUID();
    const items_snapshot = items.map(item => ({
      product_id: String(item.product_id),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image ?? null,
    }));

    const subtotal = items_snapshot.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order_number = generateOrderNumber();

    /* -------- 1. INSERT INTO ORDERS -------- */
    const { error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        id: order_id,
        order_number,
        status: "requested",
        subtotal,
        total: subtotal,
        currency,
        customer_snapshot: {
          name: customer?.name ?? "",
          phone: customer?.phone ?? "",
          address: customer?.address ?? "",
        },
        items_snapshot,
        user_id: user.id,
      });

    if (orderError) throw orderError;

    /* -------- 2. INSERT INTO ORDER_ITEMS (الحل المفقود) -------- */
    // نقوم بإدراج كل صنف في الجدول المستقل ليظهر في لوحة التحكم
    const { error: itemsTableError } = await serviceSupabase
      .from("order_items")
      .insert(
        items_snapshot.map(item => ({
          order_id: order_id, // ربط الصنف بالطلب الرئيسي
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        }))
      );

    if (itemsTableError) {
      console.error("ORDER_ITEMS INSERT ERROR:", itemsTableError);
      // ملاحظة: لم نوقف العملية هنا لأن الطلب الرئيسي تم إنشاؤه بالفعل، 
      // ولكن هذا الخطأ يفسر لماذا كان الجدول يظل فارغاً.
    }

    /* -------- 3. TRACKING EVENTS -------- */
    await serviceSupabase.from("order_tracking_events").insert([
      { order_id: order_id, status: "requested", actor: "system" },
    ]);

    return NextResponse.json({
      success: true,
      orderId: order_id,
      order_number,
    });

  } catch (error: any) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}