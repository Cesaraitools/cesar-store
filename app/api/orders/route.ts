import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";
import * as Sentry from "@sentry/nextjs";

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

type DbCartItem = {
  product_id: string;
  quantity: number | string;
  name_ar?: string | null;
  name_en?: string | null;
  price: number | string;
  image?: string | null;
};

type StockConflict = {
  productId: string;
  requested: number;
  available: number;
  productName?: string;
};

function getErrorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

function getInsufficientStockProductId(error: unknown) {
  const match = getErrorText(error).match(
    /Insufficient stock for product ([0-9a-f-]{36})/i
  );

  return match?.[1] ?? null;
}

function stockConflictPayload(conflict: StockConflict) {
  const productLabel = conflict.productName
    ? ` من "${conflict.productName}"`
    : "";
  const availableText =
    conflict.available > 0
      ? `المتاح حاليا ${conflict.available} فقط.`
      : "المنتج نفد من المخزون حاليا.";

  return {
    error: `تعذر إتمام الطلب لأن الكمية المطلوبة${productLabel} لم تعد متاحة. ${availableText}`,
    code: "INSUFFICIENT_STOCK",
    productId: conflict.productId,
    available: conflict.available,
    requested: conflict.requested,
  };
}

async function findStockConflict(
  items: FinalOrderItem[],
  productId?: string | null
): Promise<StockConflict | null> {
  const wantedItems = productId
    ? items.filter((item) => item.product_id === productId)
    : items;

  if (!wantedItems.length) return null;

  const productIds = wantedItems.map((item) => item.product_id);
  const { data: products } = await serviceSupabase
    .from("products")
    .select("id, name_ar, name_en, stock, is_active")
    .in("id", productIds);

  const productsById = new Map(
    (products ?? []).map((product) => [String(product.id), product])
  );

  for (const item of wantedItems) {
    const product = productsById.get(item.product_id);
    const available =
      product && product.is_active
        ? Math.max(0, Math.floor(Number(product.stock) || 0))
        : 0;

    if (!product || available < item.quantity) {
      return {
        productId: item.product_id,
        requested: item.quantity,
        available,
        productName:
          item.name_ar ||
          item.name_en ||
          product?.name_ar ||
          product?.name_en ||
          undefined,
      };
    }
  }

  return null;
}

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
if (!await rateLimit(ip, 10, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}

let order_token: string | null = null;
let activeCartIds: string[] = [];
  try {
    const user = await resolveUser(request);
   
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    order_token = body.order_token ?? null;

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

    let finalItems: FinalOrderItem[] = [];
   

    try {
  const { data: carts } = await serviceSupabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  activeCartIds = (carts ?? []).map((entry) => String(entry.id));

  if (activeCartIds.length > 0) {
   const { data: cartItems } = await serviceSupabase
      .from("cart_items")
      .select("product_id, quantity, name_ar, name_en, price, image")
      .in("cart_id", activeCartIds);

    if (cartItems && cartItems.length > 0) {
      finalItems = (cartItems as DbCartItem[]).map((ci) => ({
        product_id: String(ci.product_id),
        quantity: Number(ci.quantity),
        name_ar: ci.name_ar ?? "",
        name_en: ci.name_en ?? "",
        price: Number(ci.price),
        image: ci.image ?? null,
      }));
    }
  }
} catch (err) {
  console.warn("Cart DB fetch failed, falling back to client payload", err);
}

/* ✅ fallback الحقيقي */
if (!finalItems.length && Array.isArray(items)) {
  finalItems = items.map((item) => ({
    product_id: String(item.product_id),
    quantity: Number(item.quantity),
    name_ar: item.name_ar ?? "",
    name_en: item.name_en ?? "",
    price: Number(item.price),
    image: item.image ?? null,
  }));
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
  if (
    !item.product_id ||
    typeof item.quantity !== "number" ||
    item.quantity <= 0 ||
    !Number.isFinite(item.price)
  ) {
    return NextResponse.json(
      { error: "Invalid item data" },
      { status: 400 }
    );
  }
}

finalItems = mergeDuplicateItems(finalItems);
    const customer_snapshot = {
  name: customer?.name ?? "",
  phone: customer?.phone ?? "",
  address: customer?.address ?? "",
};

// ===== RPC MODE (SAFE TEST) =====
    try {
let data, error;
let attempts = 0;
const maxRetries = 2;

while (attempts <= maxRetries) {
  const response = await serviceSupabase.rpc("create_order_atomic", {
    p_user_id: user.id,
    p_items: finalItems,
    p_customer: customer_snapshot,
    p_currency: currency,
    p_order_token: order_token,
  });

  data = response.data;
  error = response.error;

  if (!error) break;
  if (getInsufficientStockProductId(error)) break;

  console.warn(`RPC attempt ${attempts + 1} failed`, error);

  attempts++;
  await new Promise((res) => setTimeout(res, 300 * attempts));
}

if (error) throw error;

const createdOrder = Array.isArray(data) ? data[0] : data;

if (!createdOrder?.order_id) {
  const stockConflict = await findStockConflict(finalItems);

  if (stockConflict) {
    return NextResponse.json(
      stockConflictPayload(stockConflict),
      { status: 409 }
    );
  }

  throw new Error("Order RPC returned no order id");
}

if (activeCartIds.length > 0) {
  const [{ error: clearCartError }, { error: closeCartError }] = await Promise.all([
    serviceSupabase
      .from("cart_items")
      .delete()
      .in("cart_id", activeCartIds),

    serviceSupabase
      .from("carts")
      .update({
        status: "ordered",
        updated_at: new Date().toISOString(),
      })
      .in("id", activeCartIds),
  ]);

  if (clearCartError || closeCartError) {
    console.warn("Cart cleanup failed after order creation", {
      userId: user.id,
      cartIds: activeCartIds,
      order_token,
      clearCartError,
      closeCartError,
    });
  }
}
if (createdOrder.reused) {
  return NextResponse.json({
    success: true,
    orderId: createdOrder.order_id,
    order_number: createdOrder.order_number,
    reused: true,
  });
}
   
      return NextResponse.json({
        success: true,
        orderId: createdOrder.order_id,
        order_number: createdOrder.order_number,
      });

        } catch (err) {
      const stockProductId = getInsufficientStockProductId(err);

      if (stockProductId) {
        const stockConflict = await findStockConflict(finalItems, stockProductId);

        return NextResponse.json(
          stockConflictPayload(
            stockConflict ?? {
              productId: stockProductId,
              requested:
                finalItems.find((item) => item.product_id === stockProductId)
                  ?.quantity ?? 0,
              available: 0,
            }
          ),
          { status: 409 }
        );
      }

      Sentry.captureException(err, {
        extra: {
          userId: user ? user.id : null,
          order_token,
          items: finalItems,
        },
      });

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
    Sentry.captureException(error, {
      extra: {
        route: "POST /api/orders",
        order_token,
        timestamp: new Date().toISOString(),
      },
    });

    console.error("Unexpected POST error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
