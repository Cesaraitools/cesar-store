import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ✅ Prevent static optimization
export const dynamic = "force-dynamic";

/* ---------------- Admin Credentials ---------------- */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || "").toLowerCase();

/* ---------------- Helpers ---------------- */

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

/* ---------------- Route ---------------- */

export async function GET(req: NextRequest) {
  try {
    // ✅ Safe ENV + Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase ENV");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /* -------- Basic Auth -------- */

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return unauthorized();
    }

    const base64 = authHeader.replace("Basic ", "");
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const [username, password] = decoded.split(":");

    if (
      username !== ADMIN_USERNAME ||
      sha256(password) !== ADMIN_PASSWORD_HASH
    ) {
      return unauthorized();
    }

    /* -------- Pagination -------- */

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 20);

    /* -------- Load Orders -------- */

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total,
        currency,
        created_at,
        customer_snapshot,
        order_tracking_events (
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to load orders" },
        { status: 500 }
      );
    }

    const orders = data.map((order) => {
      const events = order.order_tracking_events || [];
      const latest =
        events.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0] || null;

      return {
        id: order.id,
        total: order.total,
        currency: order.currency,
        created_at: order.created_at,
        customer_snapshot: order.customer_snapshot,
        status: latest?.status || "requested",
      };
    });

    return NextResponse.json({
      ok: true,
      orders,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}