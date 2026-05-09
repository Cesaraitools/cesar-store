// /app/api/cart/items/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Auth client (JWT verification only)
const supabaseAuth = createClient(
  supabaseUrl,
  supabaseAnonKey,
  { auth: { persistSession: false } }
);

// DB client (service role)
const serviceSupabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ===============================
// Helper: get user from request
// ===============================
async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

// ===============================
// Helper: get or create cart
// ===============================
async function getOrCreateActiveCart(userId: string) {
  const { data: existingCarts, error } = await serviceSupabase
    .from("carts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  const existingCart = existingCarts?.[0] ?? null;

  if (existingCart) return existingCart;

  if (error && error.code !== "PGRST116") {
    throw new Error("Failed to fetch cart");
  }

  const { data: newCart, error: createError } = await serviceSupabase
    .from("carts")
    .insert({ user_id: userId })
    .select()
    .single();

  if (createError) {
    throw new Error("Failed to create cart");
  }

  return newCart;
}

async function getActiveCartIds(userId: string) {
  const { data: carts, error } = await serviceSupabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch active carts");
  }

  return (carts ?? []).map((cart) => String(cart.id));
}

// ===============================
// GET: Get cart items
// ===============================
export async function GET(req: Request) {
  const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 25, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cartIds = await getActiveCartIds(user.id);
    const primaryCartId = cartIds[0] ?? null;

    if (!primaryCartId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const { data: items, error } = await serviceSupabase
      .from("cart_items")
      .select(`
        *,
        products (
          stock
        )
      `)
      .eq("cart_id", primaryCartId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    const formattedItems = (items || []).map((item: any) => ({
      ...item,
      stock: item.products?.stock ?? 0,
    }));

    return NextResponse.json({ items: formattedItems }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// ===============================
// POST: Add item to cart
// ===============================
export async function POST(req: Request) {
  const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 20, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { product_id, quantity = 1 } = body;

  if (!product_id || quantity <= 0) {
    return NextResponse.json(
      { error: "Invalid product or quantity" },
      { status: 400 }
    );
  }

  try {
    const cart = await getOrCreateActiveCart(user.id);

    // GET PRODUCT SNAPSHOT + STOCK
    const { data: product } = await serviceSupabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    // ✅ Stock check عند الإضافة
    if (!product || !product.is_active) {
      return NextResponse.json(
        { error: "Product not available" },
        { status: 400 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock", available: product.stock },
        { status: 400 }
      );
    }

    // Check if item already exists
    const { data: existingItem } = await serviceSupabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .single();

    if (existingItem) {
      // استبدل الكمية بدل ما تجمعها
      const { error: updateError } = await serviceSupabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", existingItem.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update item quantity" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // INSERT WITH SNAPSHOT
    const { error: insertError } = await serviceSupabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id,
        quantity,
        name_ar: product?.name_ar ?? "",
        name_en: product?.name_en ?? "",
        price: Number(product?.price ?? 0),
        image: product?.image ?? product?.image_url ?? null,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to add item to cart" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// ===============================
// PATCH: Update quantity
// ===============================
export async function PATCH(req: Request) {
  const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 20, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { product_id, quantity } = body;

  if (!product_id || quantity <= 0) {
    return NextResponse.json(
      { error: "Invalid product or quantity" },
      { status: 400 }
    );
  }

  try {
    // ✅ Stock check عند تغيير الكمية من الكارت
    const { data: product } = await serviceSupabase
      .from("products")
      .select("stock, is_active")
      .eq("id", product_id)
      .single();

    if (!product || !product.is_active) {
      return NextResponse.json(
        { error: "Product not available" },
        { status: 400 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock", available: product.stock },
        { status: 400 }
      );
    }

    const cartIds = await getActiveCartIds(user.id);

    if (cartIds.length === 0) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const { error } = await serviceSupabase
      .from("cart_items")
      .update({ quantity })
      .in("cart_id", cartIds)
      .eq("product_id", product_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update quantity" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// ===============================
// DELETE: Remove item
// ===============================
export async function DELETE(req: Request) {
  const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 15, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { product_id, clear } = body;

  if (!clear && !product_id) {
    return NextResponse.json(
      { error: "Invalid product" },
      { status: 400 }
    );
  }

  try {
    const cartIds = await getActiveCartIds(user.id);

    if (cartIds.length === 0) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const deleteQuery = serviceSupabase
      .from("cart_items")
      .delete();

    const { error } = clear
      ? await deleteQuery.in("cart_id", cartIds)
      : await deleteQuery
          .in("cart_id", cartIds)
          .eq("product_id", product_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
