import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function mergeRequestedItems(items: any[]) {
  const merged = new Map<
    string,
    { product_id: string; quantity: number; variant_key: string; variant: any }
  >();

  for (const item of items) {
    const productId = item?.product_id ? String(item.product_id) : "";
    const variantKey =
      typeof item?.variant_key === "string" ? item.variant_key : "";
    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));

    if (!productId || quantity <= 0) continue;

    const itemKey = `${productId}::${variantKey}`;
    const existing = merged.get(itemKey);
    merged.set(itemKey, {
      product_id: productId,
      variant_key: variantKey,
      variant: item?.variant ?? null,
      quantity: (existing?.quantity ?? 0) + quantity,
    });
  }

  return Array.from(merged.values());
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
    if (insertError.code === "23505") {
      const { data: retryUser } = await serviceSupabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (retryUser) return;
    }

    console.warn("Public user sync failed during cart merge", {
      code: insertError.code,
      userId: user.id,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const itemsToMerge = mergeRequestedItems(items);

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

      if (createCartError?.code === "23505") {
        const { data: retryCarts, error: retryCartError } = await serviceSupabase
          .from("carts")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1);

        if (!retryCartError && retryCarts?.[0]) {
          cart = retryCarts[0];
        }
      }

      if (!cart && (createCartError || !newCart)) {
        throw new Error(
          `Failed to create user cart: ${
            createCartError?.message || "No cart returned"
          }`
        );
      }

      if (!cart) {
        cart = newCart;
      }
    }

    const activeCartIds = (carts ?? []).map((entry) => String(entry.id));
    const cartIds = activeCartIds.includes(String(cart.id))
      ? activeCartIds
      : [...activeCartIds, String(cart.id)];

    const { data: existingItems, error: existingItemsError } =
      await serviceSupabase
        .from("cart_items")
        .select("id, product_id, quantity, variant_key")
        .in("cart_id", cartIds);

    if (existingItemsError) {
      throw new Error(
        `Failed to fetch cart items: ${existingItemsError.message}`
      );
    }

    for (const item of itemsToMerge) {
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
        .select("name_ar, name_en, price, image_url, stock, is_active, variants_json")
        .eq("id", productId)
        .single();

      if (productError || !product || !product.is_active || product.stock <= 0) {
        continue;
      }

      const productStock = Math.max(0, Math.floor(Number(product.stock) || 0));
      const hasVariantRows =
        Array.isArray(product.variants_json) && product.variants_json.length > 0;
      const variantKey = hasVariantRows ? item.variant_key : "";
      const variantSnapshot = hasVariantRows ? item.variant ?? {} : {};
      const variant = hasVariantRows
        ? product.variants_json.find(
            (entry: any) =>
              (entry?.key || entry?.id || "") === variantKey &&
              entry?.active !== false
          )
        : null;
      const availableStock =
        variantKey || hasVariantRows
          ? variant
            ? Math.max(
                0,
                Math.floor(
                  Number(
                    typeof variant.stock === "number"
                      ? variant.stock
                      : productStock
                  ) || 0
                )
              )
            : 0
          : productStock;
      const itemPrice =
        variant && typeof variant.price === "number" && variant.price > 0
          ? Number(variant.price)
          : Number(product.price ?? 0);
      const allowedQuantity = Math.min(requestedQuantity, availableStock);
      const existing = existingItems?.find(
        (ei) =>
          ei.product_id === productId &&
          (ei.variant_key || "") === variantKey
      );

      if (hasVariantRows && !variant) {
        continue;
      }

      if (availableStock <= 0) {
        continue;
      }

      if (existing) {
        const duplicateIds = existingItems
          ?.filter((ei) => ei.product_id === productId && ei.id !== existing.id)
          ?.filter((ei) => (ei.variant_key || "") === variantKey)
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
            price: itemPrice,
            variant_key: variantKey,
            variant_snapshot: variantSnapshot,
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
