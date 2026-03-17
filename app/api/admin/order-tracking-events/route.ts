import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/* ================= Runtime ================= */

export const runtime = "nodejs";

/* ================= Supabase (Service Role) ================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ================= Admin Auth ================= */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || "").toLowerCase();

/* ================= Helpers ================= */

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

/* ================= Route ================= */

export async function GET(req: NextRequest) {
  try {
    /* -------- Basic Auth -------- */

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

    /* -------- Params -------- */

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    /* -------- Load Events -------- */

    const { data, error } = await supabase
      .from("order_tracking_events")
      .select("status, created_at, actor")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("load tracking events error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load tracking events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId,
      events: data || [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}