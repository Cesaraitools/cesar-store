// /app/api/cart/items/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const { data: existingCart, error } = await serviceSupabase
    .from("carts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

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

// ===============================
// GET: Get cart items
// ===============================
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: cart } = await serviceSupabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!cart) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const { data: items, error } = await serviceSupabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", cart.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: items || [] }, { status: 200 });
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

    // 🔥 GET PRODUCT SNAPSHOT
    const { data: product } = await serviceSupabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    // Check if item already exists
    const { data: existingItem } = await serviceSupabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .single();

    if (existingItem) {
      const { error: updateError } = await serviceSupabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update item quantity" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 🔥 INSERT WITH SNAPSHOT
    const { error: insertError } = await serviceSupabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id,
        quantity,
        name: product?.title ?? product?.name ?? "Product",
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
    const { data: cart } = await serviceSupabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const { error } = await serviceSupabase
      .from("cart_items")
      .update({ quantity })
      .eq("cart_id", cart.id)
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
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { product_id } = body;

  if (!product_id) {
    return NextResponse.json(
      { error: "Invalid product" },
      { status: 400 }
    );
  }

  try {
    const { data: cart } = await serviceSupabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const { error } = await serviceSupabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id)
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