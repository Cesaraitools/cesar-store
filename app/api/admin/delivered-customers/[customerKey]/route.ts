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

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
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

function createCustomerKey(
  customer: ReturnType<typeof normalizeCustomerSnapshot>,
  userId: string,
  email: string
) {
  const phone = normalizePhone(customer.phone);

  if (phone) return `phone:${phone}`;
  if (userId) return `user:${userId}`;
  if (email) return `email:${email.toLowerCase()}`;

  return `snapshot:${[customer.name, customer.address]
    .filter(Boolean)
    .join("|")
    .toLowerCase()}`;
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { customerKey: string } }
) {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const customerKey = decodeURIComponent(params.customerKey || "");

    if (!customerKey) {
      return NextResponse.json(
        { error: "Missing customer key" },
        { status: 400 }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        "id, order_number, user_id, status, total, currency, created_at, customer_snapshot"
      )
      .order("created_at", { ascending: false });

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

    const emailMap = await loadUserEmailMap(
      (orders || [])
        .map((order) => String(order.user_id || ""))
        .filter(Boolean)
    );

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

    const matchingOrders = (orders || [])
      .map((order) => {
        const userId = String(order.user_id || "");
        const customer = normalizeCustomerSnapshot(order.customer_snapshot);
        const email =
          customer.email || (userId ? emailMap.get(userId) || "" : "");
        const key = createCustomerKey(customer, userId, email);

        if (key !== customerKey) {
          return null;
        }

        const orderTracking = trackingMap.get(order.id) || [];
        const latestTracking =
          orderTracking.length > 0
            ? orderTracking[orderTracking.length - 1]
            : null;
        const deliveredEvent = [...orderTracking]
          .reverse()
          .find((event) => event.status === "delivered");

        return {
          id: order.id,
          order_number: order.order_number || order.id,
          created_at: order.created_at,
          total: Number(order.total || 0),
          currency: order.currency || "EGP",
          current_status: resolveOrderStatus(
            order.status,
            latestTracking?.status
          ),
          status_at: latestTracking?.created_at || order.created_at,
          delivered_at: deliveredEvent?.created_at || null,
          customer: {
            ...customer,
            email,
          },
        };
      })
      .filter(Boolean);

    const customer =
      matchingOrders.length > 0 ? (matchingOrders[0] as any).customer : null;

    return NextResponse.json({
      customer,
      orders: matchingOrders,
      summary: {
        totalOrders: matchingOrders.length,
        deliveredOrders: matchingOrders.filter(
          (order: any) => order.current_status === "delivered"
        ).length,
        totalValue: matchingOrders.reduce(
          (sum: number, order: any) => sum + Number(order.total || 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error("Delivered Customer Details Error:", error);
    return NextResponse.json(
      { error: "Failed to load customer details" },
      { status: 500 }
    );
  }
}
