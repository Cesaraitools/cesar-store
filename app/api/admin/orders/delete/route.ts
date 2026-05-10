const RATE_LIMIT = new Map<string, { count: number; last: number }>();

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  /* 🚫 Rate Limit */
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
return NextResponse.json(
{ error: "Too many requests" },
{ status: 429 }
);
}

  /* 🔒 Security */
if (!(await validateAdminSession())) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
  try {
    const { ids } = await req.json();
    /* ✅ Validation */
if (!Array.isArray(ids)) {
return NextResponse.json({ error: "Invalid ids format" }, { status: 400 });
}

if (ids.length > 50) {
return NextResponse.json({ error: "Too many ids" }, { status: 400 });
}

for (const id of ids) {
if (typeof id !== "string" || id.length < 10) {
return NextResponse.json({ error: "Invalid id value" }, { status: 400 });
}
}


    if (!ids || !ids.length) {
      return NextResponse.json({ error: "No ids" }, { status: 400 });
    }
    // أرشفة الطلبات فقط مع الإبقاء على العناصر وسجل التتبع
    // حتى لا نفقد الحالة الفعلية عند الاسترجاع من الأرشيف.
    const { error } = await supabase
.from("orders")
.update({ archived_at: new Date().toISOString() })
.in("id", ids);


    if (error) {
return NextResponse.json(
{ error: "Archive failed" },
{ status: 500 }
);
}

/* 🧠 Audit Log */
await supabase.from("admin_audit_logs").insert(
ids.map((id: string) => ({
admin_email: process.env.ADMIN_USERNAME || "admin",
action: "archive",
entity: "orders",
entity_id: id,
}))
);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
