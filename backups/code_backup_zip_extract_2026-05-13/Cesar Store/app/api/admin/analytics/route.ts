import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeCategory } from "@/lib/category-normalizer";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export const dynamic = "force-dynamic";

type TrackingStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

type OrderSnapshotItem = {
  product_id: string;
  quantity: number;
  price: number;
  name: string;
};

type NormalizedOrder = {
  id: string;
  order_number: string;
  user_id: string | null;
  created_at: string;
  total: number;
  currency: string;
  current_status: TrackingStatus;
  status_at: string | null;
  items: OrderSnapshotItem[];
};

type ProductMeta = {
  id: string;
  name: string;
  category: string;
};

type ProductSalesRow = {
  product_id: string;
  product_name: string;
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

type CategorySalesRow = {
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseOrderItems(itemsSnapshot: any[]): OrderSnapshotItem[] {
  const merged = new Map<string, OrderSnapshotItem>();

  for (const item of itemsSnapshot || []) {
    const productId = String(item?.product_id || "");
    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    const price = Number(item?.price || 0);
    const name = String(
      item?.name_ar || item?.name_en || item?.name || "Unnamed product"
    );

    if (!productId || quantity <= 0 || price <= 0) {
      continue;
    }

    const existing = merged.get(productId);

    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    merged.set(productId, {
      product_id: productId,
      quantity,
      price,
      name,
    });
  }

  return Array.from(merged.values());
}

function toDayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return null;

  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

export async function GET(req: NextRequest) {
  try {
    if (!(await validateAdminSession())) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const statusFilter = searchParams.get("status");
    const productIdFilter = searchParams.get("productId");
    const categoryFilter = normalizeCategory(searchParams.get("category"));

    let ordersQuery = supabase
      .from("orders")
      .select(
        "id, order_number, user_id, created_at, total, currency, items_snapshot"
      )
      .order("created_at", { ascending: false });

    if (dateFrom) {
      ordersQuery = ordersQuery.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      ordersQuery = ordersQuery.lte("created_at", `${dateTo}T23:59:59.999`);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      throw ordersError;
    }

    const orderIds = (orders || []).map((order) => order.id);

    const { data: trackingEvents, error: trackingError } = orderIds.length
      ? await supabase
          .from("order_tracking_events")
          .select("order_id, status, created_at")
          .in("order_id", orderIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (trackingError) {
      throw trackingError;
    }

    const trackingMap = new Map<
      string,
      Array<{ status: TrackingStatus; created_at: string }>
    >();

    for (const event of trackingEvents || []) {
      const current = trackingMap.get(event.order_id) || [];
      current.push({
        status: event.status as TrackingStatus,
        created_at: event.created_at,
      });
      trackingMap.set(event.order_id, current);
    }

    const normalizedOrders: NormalizedOrder[] = (orders || []).map((order) => {
      const items = parseOrderItems(order.items_snapshot || []);

      const orderTracking = trackingMap.get(order.id) || [];
      const latestTracking =
        orderTracking.length > 0
          ? orderTracking[orderTracking.length - 1]
          : {
              status: "requested" as TrackingStatus,
              created_at: order.created_at,
            };

      return {
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        created_at: order.created_at,
        total: Number(order.total || 0),
        currency: order.currency || "EGP",
        current_status: latestTracking.status,
        status_at: latestTracking.created_at,
        items,
      };
    });

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name_ar, name_en, category")
      .order("name_ar", { ascending: true });

    if (productsError) {
      throw productsError;
    }

    const productMap = new Map<string, ProductMeta>();
    for (const product of products || []) {
      productMap.set(String(product.id), {
        id: String(product.id),
        name: String(product.name_ar || product.name_en || "Unnamed product"),
        category: normalizeCategory(product.category || "uncategorized"),
      });
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("category")
      .order("category", { ascending: true });

    if (categoriesError) {
      throw categoriesError;
    }

    const filteredOrders = normalizedOrders.filter((order) => {
      if (statusFilter && order.current_status !== statusFilter) {
        return false;
      }

      const hasMatchingProduct = productIdFilter
        ? order.items.some((item) => item.product_id === productIdFilter)
        : true;

      const hasMatchingCategory = categoryFilter
        ? order.items.some((item) => {
            const productMeta = productMap.get(item.product_id);
            return (
              normalizeCategory(productMeta?.category || "uncategorized") ===
              categoryFilter
            );
          })
        : true;

      return hasMatchingProduct && hasMatchingCategory;
    });

    const salesOrders = filteredOrders.filter(
      (order) => order.current_status !== "canceled"
    );

    const financialTotalsMap = new Map<
      string,
      { currency: string; revenue_sum: number; ordersCount: number }
    >();

    for (const order of salesOrders) {
      const current = financialTotalsMap.get(order.currency) || {
        currency: order.currency,
        revenue_sum: 0,
        ordersCount: 0,
      };

      current.revenue_sum += order.total;
      current.ordersCount += 1;
      financialTotalsMap.set(order.currency, current);
    }

    const financials = Array.from(financialTotalsMap.values()).map((row) => ({
      currency: row.currency,
      revenue_sum: row.revenue_sum,
      avg_order_value: row.ordersCount
        ? row.revenue_sum / row.ordersCount
        : 0,
    }));

    const ordersPerDayMap = new Map<string, number>();
    for (const order of filteredOrders) {
      const day = toDayKey(order.created_at);
      ordersPerDayMap.set(day, (ordersPerDayMap.get(day) || 0) + 1);
    }

    const ordersPerDay = Array.from(ordersPerDayMap.entries())
      .map(([day, orders_count]) => ({ day, orders_count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const revenuePerDayMap = new Map<string, number>();
    for (const order of salesOrders) {
      const key = `${toDayKey(order.created_at)}__${order.currency}`;
      revenuePerDayMap.set(key, (revenuePerDayMap.get(key) || 0) + order.total);
    }

    const revenuePerDay = Array.from(revenuePerDayMap.entries())
      .map(([key, revenue]) => {
        const [day, currency] = key.split("__");
        return { day, currency, revenue };
      })
      .sort((a, b) => a.day.localeCompare(b.day));

    const lifecycle = filteredOrders.map((order) => {
      const events = trackingMap.get(order.id) || [];

      const requestedAt =
        events.find((event) => event.status === "requested")?.created_at ||
        order.created_at;
      const confirmedAt = events.find(
        (event) => event.status === "confirmed"
      )?.created_at;
      const shippedAt = events.find(
        (event) => event.status === "shipped"
      )?.created_at;
      const deliveredAt = events.find(
        (event) => event.status === "delivered"
      )?.created_at;

      return {
        order_id: order.id,
        time_to_confirm: formatDuration(requestedAt, confirmedAt),
        time_to_ship: formatDuration(confirmedAt, shippedAt),
        time_to_deliver: formatDuration(shippedAt, deliveredAt),
      };
    });

    const productSalesMap = new Map<
      string,
      ProductSalesRow & { orderIds: Set<string> }
    >();

    const categorySalesMap = new Map<
      string,
      CategorySalesRow & { orderIds: Set<string> }
    >();

    for (const order of salesOrders) {
      for (const item of order.items) {
        const productMeta = productMap.get(item.product_id);
        const productCategory = normalizeCategory(
          productMeta?.category || "uncategorized"
        );

        if (productIdFilter && item.product_id !== productIdFilter) {
          continue;
        }

        if (categoryFilter && productCategory !== categoryFilter) {
          continue;
        }

        const productKey = `${item.product_id}__${order.currency}`;
        const existingProduct = productSalesMap.get(productKey) || {
          product_id: item.product_id,
          product_name: productMeta?.name || item.name,
          category: productCategory,
          currency: order.currency,
          units_sold: 0,
          orders_count: 0,
          gross_sales: 0,
          orderIds: new Set<string>(),
        };

        existingProduct.units_sold += item.quantity;
        existingProduct.gross_sales += item.quantity * item.price;
        existingProduct.orderIds.add(order.id);
        existingProduct.orders_count = existingProduct.orderIds.size;
        productSalesMap.set(productKey, existingProduct);

        const categoryKey = `${productCategory}__${order.currency}`;
        const existingCategory = categorySalesMap.get(categoryKey) || {
          category: productCategory,
          currency: order.currency,
          units_sold: 0,
          orders_count: 0,
          gross_sales: 0,
          orderIds: new Set<string>(),
        };

        existingCategory.units_sold += item.quantity;
        existingCategory.gross_sales += item.quantity * item.price;
        existingCategory.orderIds.add(order.id);
        existingCategory.orders_count = existingCategory.orderIds.size;
        categorySalesMap.set(categoryKey, existingCategory);
      }
    }

    const productSales = Array.from(productSalesMap.values())
      .map(({ orderIds, ...row }) => row)
      .sort((a, b) => b.gross_sales - a.gross_sales);

    const categorySales = Array.from(categorySalesMap.values())
      .map(({ orderIds, ...row }) => row)
      .sort((a, b) => b.gross_sales - a.gross_sales);

    const ordersIndex = filteredOrders.map((order) => ({
      order_id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      created_at: order.created_at,
      current_status: order.current_status,
      status_at: order.status_at,
    }));

    const productOptions = (products || []).map((product) => ({
      id: String(product.id),
      name: String(product.name_ar || product.name_en || "Unnamed product"),
      category: normalizeCategory(product.category || "uncategorized"),
    }));

    const categoryOptions = Array.from(
      new Set([
        ...(categories || []).map((category) =>
          normalizeCategory(category.category || "uncategorized")
        ),
        ...productOptions.map((product) => product.category),
      ])
    ).filter(Boolean);

    return NextResponse.json({
      volume: {
        total_orders: filteredOrders.length,
      },
      financials,
      reliability: {
        cancel_rate: filteredOrders.length
          ? filteredOrders.filter((order) => order.current_status === "canceled")
              .length / filteredOrders.length
          : 0,
        total_orders: filteredOrders.length,
      },
      ordersPerDay,
      revenuePerDay,
      lifecycle,
      multipleVersions: [],
      ordersIndex,
      productSales,
      categorySales,
      productOptions,
      categoryOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Analytics fetch failed",
        details: error.message ?? error,
      },
      { status: 500 }
    );
  }
}
