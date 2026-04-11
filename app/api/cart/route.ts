import { NextResponse } from "next/server";
import { createAnonServerClient, createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* -------------------------------------------------
   Feature flag
-------------------------------------------------- */

const DB_ENABLED = Boolean(serviceRoleKey);

/* -------------------------------------------------
   Auth client (JWT verification only)
-------------------------------------------------- */

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabaseAuth = createAnonServerClient();

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
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔒 DB disabled → return safe empty cart
  if (!DB_ENABLED) {
    return NextResponse.json({ cart: null }, { status: 200 });
  }

  const supabaseDb = createServiceRoleClient();

  const { data: cart, error } = await supabaseDb
    .from("carts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }

  return NextResponse.json({ cart: cart ?? null });
}

/* -------------------------------------------------
   POST /api/cart
-------------------------------------------------- */

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔒 DB disabled → pretend success (Hybrid deferred)
  if (!DB_ENABLED) {
    return NextResponse.json(
      { cart: { id: "local-only", user_id: user.id } },
      { status: 200 }
    );
  }

  const supabaseDb = createServiceRoleClient();

  const { data: existingCart } = await supabaseDb
    .from("carts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existingCart) {
    return NextResponse.json({ cart: existingCart }, { status: 200 });
  }

  const { data: newCart, error } = await supabaseDb
    .from("carts")
    .insert({
      user_id: user.id,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create cart" },
      { status: 500 }
    );
  }

  return NextResponse.json({ cart: newCart }, { status: 201 });
}
