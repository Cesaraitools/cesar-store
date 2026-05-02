import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

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

export async function GET(request: Request) {
  try {
    const user = await resolveUser(request);
    console.log("ORDER USER", {
  userId: user?.id,
  email: user?.email,
});

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
 const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";
if (!rateLimit(ip, 10, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
console.log("ORDER REQUEST START", {
  ip,
  time: new Date().toISOString(),
});
  try {
    const user = await resolveUser(request);
    console.log("ORDER USER", {
  userId: user?.id,
  email: user?.email,
});

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

    if (finalItems.length === 0) {
  return NextResponse.json(
    { error: "Cart not synced with database" },
    { status: 400 }
  );
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
    }
    const customer_snapshot = {
  name: customer?.name ?? "",
  phone: customer?.phone ?? "",
  address: customer?.address ?? "",
};
console.log("ORDER CREATE ATTEMPT", {
  userId: user.id,
  itemsCount: finalItems.length,
  order_token,
});
    // ===== RPC MODE (SAFE TEST) =====
  try {
    const { data, error } = await serviceSupabase.rpc(
      "create_order_atomic",
      {
        p_user_id: user.id,
        p_items: finalItems,
        p_customer: customer_snapshot,
        p_currency: currency,
        p_order_token: order_token,
      }
    );

    if (error) throw error;
    console.log("ORDER SUCCESS", {
  orderId: data.order_id,
  orderNumber: data.order_number,
});

    return NextResponse.json({
      success: true,
      orderId: data.order_id,
      order_number: data.order_number,
    });

  } catch (err) {
  console.error("ORDER FAILED", {
  error: err,
  userId: user?.id,
  order_token,
});

  return NextResponse.json(
    { error: "Order creation failed" },
    { status: 500 }
    );
   }
   } catch (error) {
  console.error("Unexpected POST error:", error);

  return NextResponse.json(
    { error: "Unexpected server error" },
    { status: 500 }
  );
}
  }
  
