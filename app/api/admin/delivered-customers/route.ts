import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

type TrackingStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

type TrackingEvent = {
  order_id: string;
  status: TrackingStatus;
  created_at: string;
};

type CustomerSnapshot = Record<string, unknown>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATUS_RANK: Record<string, number> = {
  requested: 1,
  confirmed: 2,
  preparing: 3,
  shipped: 4,
  delivered: 5,
  canceled: 6,
};

function resolveOrderStatus(
  orderStatus?: string | null,
  trackingStatus?: string | null
) {
  if (orderStatus === "canceled" || trackingStatus === "canceled") {
    return "canceled";
  }

  const orderRank = STATUS_RANK[orderStatus || ""] ?? 0;
  const trackingRank = STATUS_RANK[trackingStatus || ""] ?? 0;

  if (orderRank >= trackingRank && orderStatus) {
    return orderStatus;
  }

  return trackingStatus || orderStatus || "requested";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const cleanValue = text(value);
    if (cleanValue) return cleanValue;
  }

  return "";
}

function normalizeCustomerSnapshot(raw: unknown) {
  const snapshot =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as CustomerSnapshot)
      : {};

  const joinedName = [text(snapshot.first_name), text(snapshot.last_name)]
    .filter(Boolean)
    .join(" ");

  return {
    name: firstText(
      snapshot.name,
      snapshot.full_name,
      snapshot.fullName,
      snapshot.customer_name,
      joinedName
    ),
    phone: firstText(
      snapshot.phone,
      snapshot.mobile,
      snapshot.whatsapp,
      snapshot.phone_number
    ),
    address: firstText(
      snapshot.address,
      snapshot.full_address,
      snapshot.fullAddress,
      snapshot.shipping_address,
      [
        text(snapshot.governorate),
        text(snapshot.city),
        text(snapshot.area),
        text(snapshot.address_line_1),
        text(snapshot.addressLine1),
        text(snapshot.address_line_2),
        text(snapshot.addressLine2),
      ]
        .filter(Boolean)
        .join(" / ")
    ),
    email: firstText(snapshot.email, snapshot.customer_email),
  };
}

async function loadUserEmailMap(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const emailMap = new Map<string, string>();

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      const email = data?.user?.email?.trim();

      if (email) {
        emailMap.set(userId, email);
      }
    })
  );

  return emailMap;
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    let ordersQuery = supabase
      .from("orders")
      .select(
        "id, order_number, user_id, status, created_at, customer_snapshot"
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

    const trackingMap = new Map<string, TrackingEvent[]>();

    for (const event of trackingEvents || []) {
      const current = trackingMap.get(event.order_id) || [];
      current.push({
        order_id: event.order_id,
        status: event.status as TrackingStatus,
        created_at: event.created_at,
      });
      trackingMap.set(event.order_id, current);
    }

    const deliveredOrders = (orders || [])
      .map((order) => {
        const orderTracking = trackingMap.get(order.id) || [];
        const latestTracking =
          orderTracking.length > 0
            ? orderTracking[orderTracking.length - 1]
            : null;
        const currentStatus = resolveOrderStatus(
          order.status,
          latestTracking?.status
        );

        if (currentStatus !== "delivered") {
          return null;
        }

        const deliveredEvent = [...orderTracking]
          .reverse()
          .find((event) => event.status === "delivered");

        return {
          order,
          delivered_at:
            deliveredEvent?.created_at || latestTracking?.created_at || null,
        };
      })
      .filter(Boolean);

    const emailMap = await loadUserEmailMap(
      deliveredOrders
        .map((entry: any) => String(entry.order.user_id || ""))
        .filter(Boolean)
    );

    const customers = deliveredOrders.map((entry: any) => {
      const customer = normalizeCustomerSnapshot(entry.order.customer_snapshot);
      const userId = String(entry.order.user_id || "");

      return {
        order_id: entry.order.id,
        order_number: entry.order.order_number || entry.order.id,
        order_created_at: entry.order.created_at,
        delivered_at: entry.delivered_at,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email || (userId ? emailMap.get(userId) || "" : ""),
      };
    });

    const uniquePhones = new Set(
      customers.map((customer: any) => customer.phone).filter(Boolean)
    );
    const withEmail = customers.filter((customer: any) => customer.email).length;

    return NextResponse.json({
      customers,
      summary: {
        deliveredOrders: customers.length,
        uniquePhones: uniquePhones.size,
        withEmail,
      },
    });
  } catch (error) {
    console.error("Delivered Customers Report Error:", error);
    return NextResponse.json(
      { error: "Failed to load delivered customers report" },
      { status: 500 }
    );
  }
}
