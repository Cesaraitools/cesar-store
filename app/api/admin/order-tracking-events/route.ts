import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!validateAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Missing orderId or status" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("order_tracking_events")
      .insert({
        order_id: orderId,
        status,
        actor: "admin",
      });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}