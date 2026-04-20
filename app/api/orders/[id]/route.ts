// app/api/orders/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ================= Resolve User ================= */

async function resolveUser(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user ?? null;
  }

  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

/* ================= Normalize Status ================= */

function normalizeStatus(status: string | null) {
  return status?.toLowerCase().trim() ?? null;
}

/* ================= GET – Order Details ================= */

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = params.id;

    /* ===== Load Order ===== */

    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError) {
  console.error("Order query error:", orderError);

  return NextResponse.json(
    { error: "Database error" },
    { status: 500 }
  );
}

if (!order) {
  return NextResponse.json(
    { error: "Order not found or not owned by user" },
    { status: 404 }
  );
}

    /* ===== Load Tracking Events ===== */

    const { data: events } = await serviceSupabase
      .from("order_tracking_events")
      .select("status")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    const timelineSteps = [
      "requested",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
    ];

    const completedStatuses = new Set(
      (events ?? []).map((e) => normalizeStatus(e.status))
    );

    const timeline = timelineSteps.map((status) => ({
      status,
      completed: completedStatuses.has(status),
    }));

    /* ===== Current Status ===== */

    const currentStatus =
      events && events.length > 0
        ? normalizeStatus(events[events.length - 1].status)
        : "requested";

    /* ===== Response ===== */

    const response = {
      order: {
        order_id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        currency: order.currency,
        status: currentStatus,
        items: order.items_snapshot ?? [],
        subtotal: order.subtotal ?? 0,
        shipping_fee: 0,
        discount: 0,
        total: order.total ?? 0,
        timeline,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Order details error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}