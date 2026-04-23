import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ================= Get or Create Cart ================= */

    const { data: carts } = await serviceSupabase
  .from("carts")
  .select("*")
  .eq("user_id", user.id)
  .eq("status", "active")
  .order("created_at", { ascending: true })
  .limit(1);

let cart = carts?.[0] ?? null;

    if (!cart) {
      const { data: newCart } = await serviceSupabase
        .from("carts")
        .insert({
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      cart = newCart;
    }

    /* ================= Existing Items ================= */

    const { data: existingItems } = await serviceSupabase
      .from("cart_items")
      .select("id, product_id, quantity")
      .eq("cart_id", cart.id);

    for (const item of items) {
      const existing = existingItems?.find(
        (ei) => ei.product_id === item.product_id
      );

      if (existing) {
        // ✅ FIX: استبدل الكمية بدل ما تجمعها — الـ local cart هو المصدر الصح
        await serviceSupabase
          .from("cart_items")
          .update({
            quantity: item.quantity,
          })
          .eq("id", existing.id);
      } else {
        /* لازم نجيب بيانات المنتج */

        const { data: product } = await serviceSupabase
          .from("products")
          .select("name_ar, name_en, price, image_url")
          .eq("id", item.product_id)
          .single();

        await serviceSupabase.from("cart_items").insert({
          cart_id: cart.id,
          product_id: item.product_id,
          quantity: item.quantity,
          name_ar: product?.name_ar ?? "",
          name_en: product?.name_en ?? "",
          price: product?.price ?? 0,
          image: product?.image_url ?? null,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
