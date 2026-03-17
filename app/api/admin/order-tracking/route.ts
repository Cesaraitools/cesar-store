import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || "").toLowerCase();

type TrackingStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

const ALLOWED_TRANSITIONS: Record<TrackingStatus, TrackingStatus[]> = {
  requested: ["confirmed", "canceled"],
  confirmed: ["preparing", "canceled"],
  preparing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

async function getCurrentStatus(orderId: string): Promise<TrackingStatus> {
  const { data } = await supabase
    .from("order_tracking_events")
    .select("status")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return "requested";
  }

  return data[0].status as TrackingStatus;
}

export async function POST(req: NextRequest) {
  try {

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return unauthorized();
    }

    const decoded = Buffer.from(
      authHeader.replace("Basic ", ""),
      "base64"
    ).toString("utf8");

    const [username, password] = decoded.split(":");

    if (
      username !== ADMIN_USERNAME ||
      sha256(password) !== ADMIN_PASSWORD_HASH
    ) {
      return unauthorized();
    }

    const body = await req.json();

    const { orderId, event } = body as {
      orderId?: string;
      event?: TrackingStatus;
    };

    if (!orderId || !event) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

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
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(event)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid transition: ${currentStatus} → ${event}`,
        },
        { status: 400 }
      );
    }

    /* ---------- Insert Tracking Event ---------- */

    const { error: insertError } = await supabase
      .from("order_tracking_events")
      .insert({
        id: crypto.randomUUID(),
        order_id: orderId,
        status: event,
        actor: ADMIN_USERNAME,
      });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to save tracking event" },
        { status: 500 }
      );
    }

    /* ---------- Update Order Status ---------- */

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: event })
      .eq("id", orderId)
      .select("id, status")
      .single();

    if (updateError) {
      console.error("update order status error:", updateError);
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