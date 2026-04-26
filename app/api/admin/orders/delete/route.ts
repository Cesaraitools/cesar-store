import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();

    if (!ids || !ids.length) {
      return NextResponse.json({ error: "No ids" }, { status: 400 });
    }

    // حذف order_items
    await supabase.from("order_items").delete().in("order_id", ids);

    // حذف tracking
    await supabase.from("order_tracking_events").delete().in("order_id", ids);

    // حذف orders
    const { error } = await supabase.from("orders").delete().in("id", ids);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}