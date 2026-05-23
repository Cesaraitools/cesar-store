import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/admin/permissions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("orders")
      .update({ archived_at: null })
      .eq("id", id);

    if (error) {
      console.error("Restore Error:", error);
      return NextResponse.json({ error: "Restore failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Restore API Crash:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
