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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) return user;
    }

    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const user = await resolveUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { order_token } = body;

if (!order_token) {
  return NextResponse.json(
    { error: "Missing order token" },
    { status: 400 }
  );
}
    const { currency = "EGP", customer, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    /* ================= DUPLICATE ORDER PROTECTION (أولاً) ================= */
    // ✅ التحقق من الطلب المكرر قبل أي عملية على الكارت

    // 🔒 Idempotency: منع تكرار الطلب بنفس token
const { data: existingOrder } = await serviceSupabase
  .from("orders")
  .select("id, order_number")
  .eq("order_token", order_token)
  .maybeSingle();

if (existingOrder) {
  return NextResponse.json({
    success: true,
    reused: true,
    orderId: existingOrder.id,
    order_number: existingOrder.order_number,
  });
}

    /* ================= SAFE DB SYNC ================= */

    let finalItems: any[] = [];
    let cartId: string | null = null;

    try {
      const { data: cart } = await serviceSupabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (cart) {
        cartId = cart.id;

        const { data: cartItems } = await serviceSupabase
          .from("cart_items")
          .select("product_id, quantity, name_ar, name_en, price, image")
          .eq("cart_id", cart.id);

        if (!cartItems || cartItems.length === 0) {
          return NextResponse.json(
            { error: "Cart is empty in DB" },
            { status: 400 }
          );
        }

        finalItems = cartItems.map((ci) => ({
          product_id: ci.product_id,
          quantity: ci.quantity,
          name_ar: ci.name_ar,
          name_en: ci.name_en,
          price: ci.price,
          image: ci.image ?? null,
        }));
      }
    } catch {
      // fallback → frontend items
    }
// 🔥 fallback لو DB فشل
if (finalItems.length === 0 && Array.isArray(items)) {
  finalItems = items;
}
    /* ================= Build Order ================= */
if (!finalItems || finalItems.length === 0) {
  return NextResponse.json(
    { error: "Order has no valid items" },
    { status: 400 }
  );
}

for (const item of finalItems) {
  if (!item.product_id || item.quantity <= 0 || item.price <= 0) {
    return NextResponse.json(
      { error: "Invalid item data" },
      { status: 400 }
    );
  }
}
const uniqueMap = new Map();

for (const item of finalItems) {
  if (!uniqueMap.has(item.product_id)) {
    uniqueMap.set(item.product_id, item);
  } else {
    const existing = uniqueMap.get(item.product_id);
    existing.quantity += item.quantity;
  }
}

finalItems = Array.from(uniqueMap.values());
// 🔒 STOCK CHECK (Inventory Protection)
const productIds = finalItems.map((item) => item.product_id);

const { data: products } = await serviceSupabase
  .from("products")
  .select("id, stock, is_active")
  .in("id", productIds);

for (const item of finalItems) {
  const product = products?.find((p) => p.id === item.product_id);

  if (!product || !product.is_active) {
    return NextResponse.json(
      { error: "Product not available" },
      { status: 400 }
    );
  }

  if (product.stock < item.quantity) {
    return NextResponse.json(
      {
        error: `Insufficient stock for product`,
        product_id: item.product_id,
        available: product.stock,
      },
      { status: 400 }
    );
  }
}

    const id = crypto.randomUUID();

    const items_snapshot: any[] = [];

    for (const item of finalItems) {
      items_snapshot.push({
        product_id: String(item.product_id),
        name_ar: item.name_ar ?? "",
        name_en: item.name_en ?? "",
        // fallback احتياطي
        name: item.name_ar || item.name_en || "",
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
        status: "requested",
        subtotal,
        total: subtotal,
        currency,
        customer_snapshot,
        items_snapshot,
        user_id: user.id,
        order_token,
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
    ]);

    /* ================= CLEAR CART (بعد نجاح الأوردر فقط) ================= */
    // ✅ نمسح الكارت فقط بعد ما الأوردر يتحفظ بنجاح

    try {
      if (cartId) {
        await serviceSupabase
          .from("cart_items")
          .delete()
          .eq("cart_id", cartId);
      }
    } catch (err) {
      console.error("CLEAR CART ERROR:", err);
      // لا نوقف العملية — الأوردر اتحفظ بالفعل
    }

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