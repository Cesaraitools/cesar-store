// =====================================================
// Admin Order Tracking API (Hardened Version)
// Cesar Store
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TrackingStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

const VALID_STATUSES: TrackingStatus[] = [
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
];

const ALLOWED_TRANSITIONS: Record<TrackingStatus, TrackingStatus[]> = {
  requested: ["confirmed", "canceled"],
  confirmed: ["preparing", "canceled"],
  preparing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

async function getCurrentStatus(orderId: string): Promise<TrackingStatus> {
  const { data } = await supabase
    .from("order_tracking_events")
    .select("status")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return "requested";

  return data[0].status as TrackingStatus;
}

export async function POST(req: NextRequest) {
  try {
    /* 🔒 Auth */
    if (!validateAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { orderId, event } = body as {
      orderId?: unknown;
      event?: unknown;
    };

    /* 🛡️ Input Validation */
    if (
      typeof orderId !== "string" ||
      orderId.length < 10 ||
      typeof event !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload format" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(event as TrackingStatus)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    const safeEvent = event as TrackingStatus;

    /* 📦 Order Check */
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const currentStatus = await getCurrentStatus(orderId);

    /* 🚫 Prevent duplicate */
    if (currentStatus === safeEvent) {
      return NextResponse.json(
        { ok: false, error: "Already in this status" },
        { status: 400 }
      );
    }

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(safeEvent)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid transition: ${currentStatus} → ${safeEvent}`,
        },
        { status: 400 }
      );
    }

    /* 📝 Insert Event */
    const { error: insertError } = await supabase
      .from("order_tracking_events")
      .insert({
        id: crypto.randomUUID(),
        order_id: orderId,
        status: safeEvent,
        actor: "admin",
      });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to save tracking event" },
        { status: 500 }
      );
    }

    /* 🔄 Update Order */
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: safeEvent })
      .eq("id", orderId)
      .select("id, status")
      .single();

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update order status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId,
      previousStatus: currentStatus,
      currentStatus: updatedOrder.status,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}