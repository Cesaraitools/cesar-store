import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type FinalOrderItem = {
  product_id: string;
  quantity: number;
  name_ar?: string;
  name_en?: string;
  price: number;
  image?: string | null;
};

type ProductStockRow = {
  id: string;
  stock: number;
  is_active: boolean;
};

type InventoryUpdate = {
  id: string;
  previousStock: number;
  previousActive: boolean;
  nextStock: number;
  nextActive: boolean;
};

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

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `CS-${timestamp}${random}`;
}

function mergeDuplicateItems(items: FinalOrderItem[]) {
  const uniqueMap = new Map<string, FinalOrderItem>();

  for (const item of items) {
    const existing = uniqueMap.get(item.product_id);

    if (!existing) {
      uniqueMap.set(item.product_id, { ...item });
      continue;
    }

    existing.quantity += item.quantity;
  }

  return Array.from(uniqueMap.values());
}

async function rollbackInventory(updates: InventoryUpdate[]) {
  for (const update of [...updates].reverse()) {
    await serviceSupabase
      .from("products")
      .update({
        stock: update.previousStock,
        is_active: update.previousActive,
      })
      .eq("id", update.id);
  }
}

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

    let finalItems: FinalOrderItem[] = [];
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
          product_id: String(ci.product_id),
          quantity: Number(ci.quantity),
          name_ar: ci.name_ar ?? "",
          name_en: ci.name_en ?? "",
          price: Number(ci.price),
          image: ci.image ?? null,
        }));
      }
    } catch {
      // Fall back to the client payload.
    }

    if (finalItems.length === 0 && Array.isArray(items)) {
      finalItems = items.map((item: any) => ({
        product_id: String(item.product_id),
        quantity: Number(item.quantity),
        name_ar: item.name_ar ?? item.name ?? "",
        name_en: item.name_en ?? item.name ?? "",
        price: Number(item.price),
        image: item.image ?? null,
      }));
    }

    if (!finalItems.length) {
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

    finalItems = mergeDuplicateItems(finalItems);

    const productIds = finalItems.map((item) => item.product_id);
    const { data: products, error: productsError } = await serviceSupabase
      .from("products")
      .select("id, stock, is_active")
      .in("id", productIds);

    if (productsError) {
      console.error("PRODUCT STOCK LOAD ERROR:", productsError);
      return NextResponse.json(
        { error: "Failed to validate stock" },
        { status: 500 }
      );
    }

    const productMap = new Map(
      (products ?? []).map((product) => [
        product.id,
        {
          id: String(product.id),
          stock: Number(product.stock ?? 0),
          is_active: Boolean(product.is_active),
        } satisfies ProductStockRow,
      ])
    );

    const inventoryUpdates: InventoryUpdate[] = [];

    for (const item of finalItems) {
      const product = productMap.get(item.product_id);

      if (!product || !product.is_active) {
        return NextResponse.json(
          { error: "Product not available" },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: "Insufficient stock for product",
            product_id: item.product_id,
            available: product.stock,
          },
          { status: 400 }
        );
      }

      const nextStock = product.stock - item.quantity;

      inventoryUpdates.push({
        id: product.id,
        previousStock: product.stock,
        previousActive: product.is_active,
        nextStock,
        nextActive: nextStock > 0,
      });
    }

    const appliedInventoryUpdates: InventoryUpdate[] = [];

    for (const update of inventoryUpdates) {
      const { data: updatedProduct, error: updateError } = await serviceSupabase
        .from("products")
        .update({
          stock: update.nextStock,
          is_active: update.nextActive,
        })
        .eq("id", update.id)
        .eq("stock", update.previousStock)
        .eq("is_active", update.previousActive)
        .select("id")
        .maybeSingle();

      if (updateError || !updatedProduct) {
        await rollbackInventory(appliedInventoryUpdates);

        const { data: latestProduct } = await serviceSupabase
          .from("products")
          .select("stock")
          .eq("id", update.id)
          .maybeSingle();

        return NextResponse.json(
          {
            error: "Insufficient stock for product",
            product_id: update.id,
            available: Number(latestProduct?.stock ?? 0),
          },
          { status: 409 }
        );
      }

      appliedInventoryUpdates.push(update);
    }

    const id = crypto.randomUUID();
    const items_snapshot = finalItems.map((item) => ({
      product_id: String(item.product_id),
      name_ar: item.name_ar ?? "",
      name_en: item.name_en ?? "",
      name: item.name_ar || item.name_en || "",
      price: item.price,
      quantity: item.quantity,
      image: item.image ?? null,
    }));

    const subtotal = items_snapshot.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const customer_snapshot = {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
    };

    const order_number = generateOrderNumber();

    const { error: orderError } = await serviceSupabase.from("orders").insert({
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
      await rollbackInventory(appliedInventoryUpdates);

      return NextResponse.json(
        { error: "Order creation failed", details: orderError.message },
        { status: 500 }
      );
    }

    await serviceSupabase.from("order_tracking_events").insert([
      { order_id: id, status: "requested", actor: "system" },
    ]);

    try {
      if (cartId) {
        await serviceSupabase.from("cart_items").delete().eq("cart_id", cartId);
      }
    } catch (err) {
      console.error("CLEAR CART ERROR:", err);
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
