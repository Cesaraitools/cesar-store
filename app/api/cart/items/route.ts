// /app/api/cart/items/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Server-side Supabase client (stateless)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

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
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

// ===============================
// Helper: get or create cart
// ===============================
async function getOrCreateActiveCart(userId: string) {
  const { data: existingCart, error } = await supabase
    .from("carts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (existingCart) return existingCart;

  if (error && error.code !== "PGRST116") {
    throw new Error("Failed to fetch cart");
  }

  const { data: newCart, error: createError } = await supabase
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
// POST: Add item to cart
// Body: { product_id: string, quantity?: number }
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

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .single();

    if (existingItem) {
      const { error: updateError } = await supabase
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

    const { error: insertError } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id,
      quantity,
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
// PATCH: Update item quantity
// Body: { product_id: string, quantity: number }
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
    const { data: cart } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const { error } = await supabase
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
// DELETE: Remove item from cart
// Body: { product_id: string }
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
    const { data: cart } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const { error } = await supabase
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