import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;
const ORDER_CHUNK_SIZE = 200;
const CAIRO_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type DeliveredEvent = {
  order_id: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string | null;
  total: number | string | null;
  currency: string | null;
  customer_snapshot: Record<string, unknown> | null;
};

function isValidDateInput(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cairoDateKey(value: string) {
  const parts = CAIRO_DATE_FORMATTER.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function broadUtcBoundary(date: string, side: "start" | "end") {
  const timestamp = Date.parse(
    `${date}T${side === "start" ? "00:00:00.000" : "23:59:59.999"}Z`
  );
  const margin = 36 * 60 * 60 * 1000;
  return new Date(timestamp + (side === "start" ? -margin : margin)).toISOString();
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function customerName(snapshot: Record<string, unknown> | null) {
  const source = snapshot || {};
  const joinedName = [text(source.first_name), text(source.last_name)]
    .filter(Boolean)
    .join(" ");

  return (
    text(source.name) ||
    text(source.full_name) ||
    text(source.fullName) ||
    text(source.customer_name) ||
    joinedName ||
    "عميل بدون اسم"
  );
}

async function loadDeliveredEvents(from: string, to: string) {
  const events: DeliveredEvent[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("order_tracking_events")
      .select("order_id, created_at")
      .eq("status", "delivered")
      .gte("created_at", broadUtcBoundary(from, "start"))
      .lte("created_at", broadUtcBoundary(to, "end"))
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data || []) as DeliveredEvent[];
    events.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return events.filter((event) => {
    const dateKey = cairoDateKey(event.created_at);
    return dateKey >= from && dateKey <= to;
  });
}

async function loadDeliveredOrders(orderIds: string[]) {
  const orders: OrderRow[] = [];

  for (let index = 0; index < orderIds.length; index += ORDER_CHUNK_SIZE) {
    const chunk = orderIds.slice(index, index + ORDER_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total, currency, customer_snapshot")
      .in("id", chunk)
      .eq("status", "delivered");

    if (error) throw error;
    orders.push(...((data || []) as OrderRow[]));
  }

  return orders;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdminRole(["full", "orders"]);
    if (guard.response) return guard.response;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!isValidDateInput(from) || !isValidDateInput(to)) {
      return NextResponse.json(
        { error: "يرجى تحديد تاريخ بداية ونهاية صحيحين" },
        { status: 400 }
      );
    }

    if (from > to) {
      return NextResponse.json(
        { error: "تاريخ البداية يجب ألا يكون بعد تاريخ النهاية" },
        { status: 400 }
      );
    }

    const deliveredEvents = await loadDeliveredEvents(from, to);
    const deliveredAtByOrder = new Map<string, string>();

    for (const event of deliveredEvents) {
      if (!deliveredAtByOrder.has(event.order_id)) {
        deliveredAtByOrder.set(event.order_id, event.created_at);
      }
    }

    const orderIds = Array.from(deliveredAtByOrder.keys());
    const orders = orderIds.length ? await loadDeliveredOrders(orderIds) : [];
    const rows = orders
      .map((order) => ({
        order_id: order.id,
        order_number: order.order_number || order.id,
        customer_name: customerName(order.customer_snapshot),
        delivered_at: deliveredAtByOrder.get(order.id) || "",
        amount_received: Math.max(0, Number(order.total) || 0),
        currency: text(order.currency) || "EGP",
      }))
      .filter((row) => row.delivered_at)
      .sort(
        (first, second) =>
          new Date(first.delivered_at).getTime() -
          new Date(second.delivered_at).getTime()
      );

    const totalsByCurrency = Array.from(
      rows.reduce((totals, row) => {
        totals.set(
          row.currency,
          (totals.get(row.currency) || 0) + row.amount_received
        );
        return totals;
      }, new Map<string, number>())
    ).map(([currency, amount]) => ({ currency, amount }));

    return NextResponse.json(
      {
        rows,
        summary: {
          from,
          to,
          order_count: rows.length,
          totals_by_currency: totalsByCurrency,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Received Orders Report Error:", error);
    return NextResponse.json(
      { error: "تعذر تحميل تقرير الطلبات المستلمة" },
      { status: 500 }
    );
  }
}
