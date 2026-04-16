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
    const { currency = "EGP", customer } = body;

    /* ================= GET CART FROM DB ================= */

    const { data: cart } = await serviceSupabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!cart) {
      return NextResponse.json(
        { error: "No active cart found" },
        { status: 400 }
      );
    }

    const { data: cartItems } = await serviceSupabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("cart_id", cart.id);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    /* ================= FETCH PRODUCTS ================= */

    const productIds = cartItems.map((ci) => ci.product_id);

    const { data: products } = await serviceSupabase
      .from("products")
      .select("id, price, name_ar, name_en, image_url, active, stock")
      .in("id", productIds);

    if (!products || products.length !== cartItems.length) {
      return NextResponse.json(
        { error: "Some products not found" },
        { status: 400 }
      );
    }

    /* ================= VALIDATION ================= */

    const finalItems: any[] = [];

    for (const ci of cartItems) {
      const product = products.find((p) => p.id === ci.product_id);

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 400 }
        );
      }

      if (product.active === false) {
        return NextResponse.json(
          { error: "Product is not active" },
          { status: 400 }
        );
      }

      if (product.stock <= 0) {
        return NextResponse.json(
          { error: "Product out of stock" },
          { status: 400 }
        );
      }

      if (ci.quantity > product.stock) {
        return NextResponse.json(
          { error: "Insufficient stock" },
          { status: 400 }
        );
      }

      finalItems.push({
        product_id: ci.product_id,
        quantity: ci.quantity,
        name_ar: product.name_ar,
        name_en: product.name_en,
        price: product.price,
        image: product.image_url ?? null,
      });
    }

    /* ================= DUPLICATE ORDER PROTECTION ================= */

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

    /* ================= BUILD ORDER ================= */

    const id = crypto.randomUUID();

    const items_snapshot = finalItems.map((item) => ({
      product_id: String(item.product_id),
      name_ar: item.name_ar ?? "",
      name_en: item.name_en ?? "",
      name: item.name_ar || item.name_en || "",
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    }));

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

    /* ================= INSERT ORDER ================= */

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
      });

    if (orderError) {
      console.error("ORDER INSERT ERROR:", orderError);
      return NextResponse.json(
        { error: "Order creation failed" },
        { status: 500 }
      );
    }

    /* ================= TRACKING ================= */

    await serviceSupabase.from("order_tracking_events").insert([
      {
        order_id: id,
        status: "requested",
        actor: "system",
      },
    ]);

    /* ================= CLEAR CART (AFTER SUCCESS ONLY) ================= */

    await serviceSupabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    return NextResponse.json({
      success: true,
      orderId: id,
      order_number,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}