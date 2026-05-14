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

async function ensurePublicUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    providers?: string[];
  };
}) {
  const { data: existingUser, error: fetchError } = await serviceSupabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to check public user: ${fetchError.message}`);
  }

  if (existingUser) return;

  const { error: insertError } = await serviceSupabase.from("users").insert({
    id: user.id,
    email: user.email ?? null,
    name:
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email ||
      null,
    avatar_url: user.user_metadata?.avatar_url || null,
    providers: user.app_metadata?.providers ?? [],
  });

  if (insertError) {
    throw new Error(`Failed to create public user: ${insertError.message}`);
  }
}

// ===============================
// Helper: get or create cart
// ===============================
async function getOrCreateActiveCart(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) {
    throw new Error("Unauthorized");
  }

  await ensurePublicUser(user);

  const { data: existingCarts, error } = await serviceSupabase
    .from("carts")
    .select("*")
    .eq("user_id", user.id)
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
    .insert({ user_id: user.id })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create cart: ${createError.message}`);
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

function normalizeCartItems(items: any[]) {
  const merged = new Map<string, any>();

  for (const item of items || []) {
    const productId = String(item.product_id);
    const existing = merged.get(productId);
    const quantity = Number(item.quantity || 0);

    if (!existing) {
      merged.set(productId, {
        ...item,
        quantity,
        stock: item.products?.stock ?? 0,
      });
      continue;
    }

    existing.quantity += quantity;
  }

  return Array.from(merged.values());
}

// ===============================
// GET: Get cart items
// ===============================
export async function GET(req: Request) {
  const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(`${ip}:cart-items:get`, 60, 60000)) {
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

    if (cartIds.length === 0) {
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
      .in("cart_id", cartIds);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    const formattedItems = normalizeCartItems(items || []);

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

if (!await rateLimit(`${ip}:cart-items:post`, 60, 60000)) {
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
  const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

  if (!product_id || requestedQuantity <= 0) {
    return NextResponse.json(
      { error: "Invalid product or quantity" },
      { status: 400 }
    );
  }

  try {
    const cart = await getOrCreateActiveCart(user);
    const activeCartIds = await getActiveCartIds(user.id);
    const cartIds = activeCartIds.includes(String(cart.id))
      ? activeCartIds
      : [...activeCartIds, String(cart.id)];

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

    const productStock = Math.max(0, Math.floor(Number(product.stock) || 0));

    if (productStock < requestedQuantity) {
      return NextResponse.json(
        { error: "Insufficient stock", available: productStock },
        { status: 400 }
      );
    }

    // Check if item already exists
    const { data: existingItems } = await serviceSupabase
      .from("cart_items")
      .select("id, cart_id, product_id, quantity")
      .in("cart_id", cartIds)
      .eq("product_id", product_id)
      .order("created_at", { ascending: true });

    const existingItem = existingItems?.[0] ?? null;

    if (existingItem) {
      const existingQuantity = Math.max(
        0,
        Math.floor(Number(existingItem.quantity) || 0)
      );
      const nextQuantity = Math.min(
        existingQuantity + requestedQuantity,
        productStock
      );

      // Add to the existing server-side quantity without exceeding stock.
      const { error: updateError } = await serviceSupabase
        .from("cart_items")
        .update({ quantity: nextQuantity })
        .eq("id", existingItem.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update item quantity" },
          { status: 500 }
        );
      }

      const duplicateIds = (existingItems ?? [])
        .slice(1)
        .map((item) => item.id);

      if (duplicateIds.length > 0) {
        await serviceSupabase
          .from("cart_items")
          .delete()
          .in("id", duplicateIds);
      }

      return NextResponse.json({
        success: true,
        available: productStock,
        quantity: nextQuantity,
      });
    }

    // INSERT WITH SNAPSHOT
    const { error: insertError } = await serviceSupabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id,
        quantity: requestedQuantity,
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

    return NextResponse.json(
      { success: true, available: productStock, quantity: requestedQuantity },
      { status: 201 }
    );

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

if (!await rateLimit(`${ip}:cart-items:patch`, 120, 60000)) {
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
  const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

  if (!product_id || requestedQuantity <= 0) {
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

    const productStock = Math.max(0, Math.floor(Number(product.stock) || 0));

    if (productStock < requestedQuantity) {
      return NextResponse.json(
        { error: "Insufficient stock", available: productStock },
        { status: 400 }
      );
    }

    const cartIds = await getActiveCartIds(user.id);

    if (cartIds.length === 0) {
      return NextResponse.json(
        { error: "Cart item not found", stale: true },
        { status: 404 }
      );
    }

    const { data: matchingItems, error: fetchItemsError } = await serviceSupabase
      .from("cart_items")
      .select("id")
      .in("cart_id", cartIds)
      .eq("product_id", product_id)
      .order("created_at", { ascending: true });

    if (fetchItemsError) {
      return NextResponse.json(
        { error: "Failed to update quantity" },
        { status: 500 }
      );
    }

    const primaryItem = matchingItems?.[0] ?? null;

    if (!primaryItem) {
      return NextResponse.json(
        { error: "Cart item not found", stale: true },
        { status: 404 }
      );
    }

    const { error } = await serviceSupabase
      .from("cart_items")
      .update({ quantity: requestedQuantity })
      .eq("id", primaryItem.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update quantity" },
        { status: 500 }
      );
    }

    const duplicateIds = (matchingItems ?? [])
      .slice(1)
      .map((item) => item.id);

    if (duplicateIds.length > 0) {
      await serviceSupabase
        .from("cart_items")
        .delete()
        .in("id", duplicateIds);
    }

    return NextResponse.json({ success: true, available: productStock });
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

if (!await rateLimit(`${ip}:cart-items:delete`, 60, 60000)) {
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
      return NextResponse.json({ success: true, stale: true });
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
