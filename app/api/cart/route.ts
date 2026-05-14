
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* -------------------------------------------------
Feature flag
-------------------------------------------------- */

const DB_ENABLED = Boolean(serviceRoleKey);

/* -------------------------------------------------
Auth client (JWT verification only)
-------------------------------------------------- */

const supabaseAuth = createClient(supabaseUrl, anonKey, {
auth: { persistSession: false },
});

/* -------------------------------------------------
DB client (only if enabled)
-------------------------------------------------- */

const supabaseDb = DB_ENABLED
? createClient(supabaseUrl, serviceRoleKey as string, {
auth: { persistSession: false },
})
: null;

/* -------------------------------------------------
Helpers
-------------------------------------------------- */

async function getUserFromRequest(req: Request) {
const authHeader = req.headers.get("authorization");
if (!authHeader) return null;

const token = authHeader.replace("Bearer ", "");

const {
data: { user },
error,
} = await supabaseAuth.auth.getUser(token);

if (error || !user) return null;
return user;
}

/* -------------------------------------------------
GET /api/cart
-------------------------------------------------- */

export async function GET(req: Request) {
    const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 20, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
const user = await getUserFromRequest(req);

if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

if (!DB_ENABLED) {
return NextResponse.json({ cart: null }, { status: 200 });
}

const { data: carts, error } = await supabaseDb!
.from("carts")
.select("*")
.eq("user_id", user.id)
.eq("status", "active")
.order("created_at", { ascending: true })
.limit(1);

if (error) {
return NextResponse.json(
{ error: "Failed to fetch cart" },
{ status: 500 }
);
}

return NextResponse.json({ cart: carts?.[0] ?? null });
}

/* -------------------------------------------------
POST /api/cart
-------------------------------------------------- */

export async function POST(req: Request) {
    const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

if (!await rateLimit(ip, 20, 60000)) {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    { status: 429 }
  );
}
const user = await getUserFromRequest(req);

if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

if (!DB_ENABLED) {
return NextResponse.json(
{ cart: { id: "local-only", user_id: user.id } },
{ status: 200 }
);
}

const { data: carts } = await supabaseDb!
.from("carts")
.select("*")
.eq("user_id", user.id)
.eq("status", "active")
.order("created_at", { ascending: true })
.limit(1);

const existingCart = carts?.[0];

if (existingCart) {
return NextResponse.json({ cart: existingCart }, { status: 200 });
}

const { data: newCart, error } = await supabaseDb!
.from("carts")
.insert({
user_id: user.id,
status: "active",
})
.select()
.single();

if (error?.code === "23505") {
const { data: retryCarts, error: retryError } = await supabaseDb!
.from("carts")
.select("*")
.eq("user_id", user.id)
.eq("status", "active")
.order("created_at", { ascending: true })
.limit(1);

if (!retryError && retryCarts?.[0]) {
return NextResponse.json({ cart: retryCarts[0] }, { status: 200 });
}
}

if (error) {
return NextResponse.json(
{ error: "Failed to create cart" },
{ status: 500 }
);
}

return NextResponse.json({ cart: newCart }, { status: 201 });
}
