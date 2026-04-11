// /app/api/cart/items/route.ts - النسخة الصحيحة المحسّنة

import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/runtime";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/* ===============================
   Helper: Extract user from request
   =============================== */

async function getUserFromRequest(req: Request): Promise<User | null> {
  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7); // Remove "Bearer "
    const supabase = createAnonServerClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/* ===============================
   Helper: Get or create active cart
   =============================== */

async function getOrCreateActiveCart(
  userId: string,
  supabase = createAnonServerClient()
) {
  try {
    // محاولة جلب السلة النشطة الموجودة
    const { data: existingCart, error: selectError } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    // إذا وجدت السلة
    if (existingCart) {
      return existingCart;
    }

    // إذا كان الخطأ ليس "no rows found"، ارمِ الخطأ
    if (selectError && selectError.code !== "PGRST116") {
      throw new Error(`Database error: ${selectError.message}`);
    }

    // إنشاء سلة جديدة
    const { data: newCart, error: insertError } = await supabase
      .from("carts")
      .insert({
        user_id: userId,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create cart: ${insertError.message}`);
    }

    if (!newCart) {
      throw new Error("Cart creation returned no data");
    }

    return newCart;
  } catch (error: any) {
    console.error("getOrCreateActiveCart error:", error);
    throw error;
  }
}

/* ===============================
   POST: Add item to cart
   Body: { product_id: string, quantity?: number }
   =============================== */

export async function POST(req: Request) {
  try {
    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // جلب وتحليل الـ body
    const body = await req.json();
    const { product_id, quantity = 1 } = body;

    // التحقق من صحة البيانات
    if (!product_id || typeof product_id !== "string") {
      return NextResponse.json(
        { error: "Invalid product_id" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid quantity: must be a positive integer" },
        { status: 400 }
      );
    }

    // إنشاء Supabase client
    const supabase = createAnonServerClient();

    // الحصول على السلة أو إنشاء واحدة جديدة
    const cart = await getOrCreateActiveCart(user.id, supabase);

    if (!cart || !cart.id) {
      return NextResponse.json(
        { error: "Failed to get or create cart" },
        { status: 500 }
      );
    }

    // التحقق من وجود العنصر مسبقاً
    const { data: existingItem, error: selectError } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking existing item:", selectError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // إذا كان العنصر موجوداً، حدّث الكمية
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      const { error: updateError } = await supabase
        .from("cart_items")
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      if (updateError) {
        console.error("Error updating item quantity:", updateError);
        return NextResponse.json(
          { error: "Failed to update item quantity" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          success: true,
          message: "Item quantity updated",
          cartItemId: existingItem.id,
          newQuantity,
        },
        { status: 200 }
      );
    }

    // إذا لم يكن موجوداً، أضف عنصر جديد
    const { data: newItem, error: insertError } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id,
        quantity,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting item:", insertError);
      return NextResponse.json(
        { error: "Failed to add item to cart" },
        { status: 500 }
      );
    }

    if (!newItem) {
      return NextResponse.json(
        { error: "Item creation returned no data" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Item added to cart",
        cartItemId: newItem.id,
        quantity: newItem.quantity,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/cart/items error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

/* ===============================
   PATCH: Update item quantity
   Body: { product_id: string, quantity: number }
   =============================== */

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { product_id, quantity } = body;

    // التحقق من صحة البيانات
    if (!product_id || typeof product_id !== "string") {
      return NextResponse.json(
        { error: "Invalid product_id" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid quantity: must be a positive integer" },
        { status: 400 }
      );
    }

    const supabase = createAnonServerClient();

    // الحصول على السلة النشطة
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (cartError) {
      if (cartError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Cart not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching cart:", cartError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!cart) {
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    // تحديث الكمية
    const { data: updatedItem, error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Item not found in cart" },
          { status: 404 }
        );
      }
      console.error("Error updating quantity:", updateError);
      return NextResponse.json(
        { error: "Failed to update quantity" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Item quantity updated",
        cartItemId: updatedItem.id,
        quantity: updatedItem.quantity,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PATCH /api/cart/items error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

/* ===============================
   DELETE: Remove item from cart
   Body: { product_id: string }
   =============================== */

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { product_id } = body;

    // التحقق من صحة البيانات
    if (!product_id || typeof product_id !== "string") {
      return NextResponse.json(
        { error: "Invalid product_id" },
        { status: 400 }
      );
    }

    const supabase = createAnonServerClient();

    // الحصول على السلة النشطة
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (cartError) {
      if (cartError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Cart not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching cart:", cartError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!cart) {
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    // حذف العنصر
    const { error: deleteError, data: deletedItems } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .select();

    if (deleteError) {
      console.error("Error deleting item:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove item" },
        { status: 500 }
      );
    }

    // التحقق من وجود العنصر قبل الحذف
    if (!deletedItems || deletedItems.length === 0) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Item removed from cart",
        removedItemsCount: deletedItems.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE /api/cart/items error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}