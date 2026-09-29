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
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const body = await req.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids
      : body?.id
      ? [body.id]
      : [];

    if (!ids.length || ids.length > 50) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)];

    if (
      uniqueIds.length !== ids.length ||
      uniqueIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))
    ) {
      return NextResponse.json({ error: "Invalid id value" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc(
      "set_retail_orders_archived_atomic",
      {
        p_order_ids: uniqueIds,
        p_archived: false,
        p_admin_email: guard.access.userEmail,
      }
    );

    if (error) {
      console.error("Restore Error:", error);
      return NextResponse.json(
        { error: "Restore failed", code: error.message },
        { status: error.message.includes("ORDER_") ? 409 : 500 }
      );
    }

    const restoredIds = Array.isArray(data) ? data.map(String) : [];

    if (restoredIds.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Restore verification failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, restoredIds });

  } catch (err) {
    console.error("Restore API Crash:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
