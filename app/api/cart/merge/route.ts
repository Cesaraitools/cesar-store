import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePublicUser(user);

    const { data: carts, error: cartsError } = await serviceSupabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (cartsError) {
      throw new Error(`Failed to fetch user carts: ${cartsError.message}`);
    }

    let cart = carts?.[0] ?? null;

    if (!cart) {
      const { data: newCart, error: createCartError } = await serviceSupabase
        .from("carts")
        .insert({
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      if (createCartError || !newCart) {
        throw new Error(
          `Failed to create user cart: ${
            createCartError?.message || "No cart returned"
          }`
        );
      }

      cart = newCart;
    }

    const activeCartIds = (carts ?? []).map((entry) => String(entry.id));
    const cartIds = activeCartIds.includes(String(cart.id))
      ? activeCartIds
      : [...activeCartIds, String(cart.id)];

    const { data: existingItems, error: existingItemsError } =
      await serviceSupabase
        .from("cart_items")
        .select("id, product_id, quantity")
        .in("cart_id", cartIds);

    if (existingItemsError) {
      throw new Error(
        `Failed to fetch cart items: ${existingItemsError.message}`
      );
    }

    for (const item of items) {
      const productId = item?.product_id;
      const requestedQuantity = Math.max(
        0,
        Math.floor(Number(item?.quantity) || 0)
      );

      if (!productId || requestedQuantity <= 0) {
        continue;
      }

      const { data: product, error: productError } = await serviceSupabase
        .from("products")
        .select("name_ar, name_en, price, image_url, stock, is_active")
        .eq("id", productId)
        .single();

      if (productError || !product || !product.is_active || product.stock <= 0) {
        continue;
      }

      const productStock = Math.max(0, Math.floor(Number(product.stock) || 0));
      const allowedQuantity = Math.min(requestedQuantity, productStock);
      const existing = existingItems?.find((ei) => ei.product_id === productId);

      if (existing) {
        const existingQuantity = Math.max(
          0,
          Math.floor(Number(existing.quantity) || 0)
        );
        const mergedQuantity = Math.min(
          existingQuantity + requestedQuantity,
          productStock
        );

        const { error: updateError } = await serviceSupabase
          .from("cart_items")
          .update({
            quantity: mergedQuantity,
          })
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(`Failed to update cart item: ${updateError.message}`);
        }

        const duplicateIds = existingItems
          ?.filter((ei) => ei.product_id === productId && ei.id !== existing.id)
          .map((ei) => ei.id);

        if (duplicateIds && duplicateIds.length > 0) {
          const { error: deleteDuplicatesError } = await serviceSupabase
            .from("cart_items")
            .delete()
            .in("id", duplicateIds);

          if (deleteDuplicatesError) {
            throw new Error(
              `Failed to remove duplicate cart items: ${deleteDuplicatesError.message}`
            );
          }
        }
      } else {
        const { error: insertItemError } = await serviceSupabase
          .from("cart_items")
          .insert({
            cart_id: cart.id,
            product_id: productId,
            quantity: allowedQuantity,
            name_ar: product.name_ar ?? "",
            name_en: product.name_en ?? "",
            price: product.price ?? 0,
            image: product.image_url ?? null,
          });

        if (insertItemError) {
          throw new Error(
            `Failed to insert cart item: ${insertItemError.message}`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CART MERGE ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
