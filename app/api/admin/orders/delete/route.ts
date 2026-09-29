const RATE_LIMIT = new Map<string, { count: number; last: number }>();

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/admin/permissions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip) || { count: 0, last: now };

  if (now - entry.last < 10000) {
    entry.count++;
  } else {
    entry.count = 1;
    entry.last = now;
  }

  RATE_LIMIT.set(ip, entry);

  if (entry.count > 20) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const guard = await requireAdminRole(["full", "orders"]);
  if (guard.response) return guard.response;

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid ids format" }, { status: 400 });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: "Too many ids" }, { status: 400 });
    }

    if (!ids.length) {
      return NextResponse.json({ error: "No ids" }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length !== ids.length) {
      return NextResponse.json({ error: "Duplicate ids" }, { status: 400 });
    }

    for (const id of uniqueIds) {
      if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
        return NextResponse.json({ error: "Invalid id value" }, { status: 400 });
      }
    }

    const { data, error } = await supabase.rpc(
      "set_retail_orders_archived_atomic",
      {
        p_order_ids: uniqueIds,
        p_archived: true,
        p_admin_email: guard.access.userEmail,
      }
    );

    if (error) {
      console.error("Archive failed:", error);
      return NextResponse.json(
        { error: "Archive failed", code: error.message },
        { status: error.message.includes("ORDER_") ? 409 : 500 }
      );
    }

    const archivedIds = Array.isArray(data) ? data.map(String) : [];

    if (archivedIds.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Archive verification failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, archivedIds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
