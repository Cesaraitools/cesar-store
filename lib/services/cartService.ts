// lib/services/cartService.ts - النسخة الكاملة

import { createClient } from "@/lib/supabase/client";
import { createAnonServerClient } from "@/lib/supabase/runtime";

const supabase = createClient();

export const cartService = {
  /**
   * 🛒 الحصول على سلة المستخدم أو إنشاء واحدة جديدة
   * - للمستخدمين المسجلين فقط
   */
  async getOrCreateUserCart(userId: string) {
    try {
      const anonSupabase = createAnonServerClient();

      // البحث عن سلة نشطة
      const { data: cart, error } = await anonSupabase
        .from("carts")
        .select(
          `
          id,
          user_id,
          status,
          created_at,
          updated_at,
          cart_items (
            id,
            cart_id,
            product_id,
            quantity,
            created_at,
            updated_at
          )
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      // إذا لم تكن موجودة (PGRST116 = no rows found)
      if (error?.code === "PGRST116") {
        const { data: newCart, error: createError } = await anonSupabase
          .from("carts")
          .insert({
            user_id: userId,
            status: "active",
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create cart: ${createError.message}`);
        }

        return {
          ...newCart,
          cart_items: [],
        };
      }

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      return cart || null;
    } catch (error: any) {
      console.error("Error getting user cart:", error);
      throw error;
    }
  },

  /**
   * ➕ إضافة منتج للسلة مع معالجة التكرار
   */
  async addToCart(
    cartId: string,
    productId: string,
    quantity: number = 1
  ) {
    try {
      const anonSupabase = createAnonServerClient();

      // التحقق من وجود العنصر
      const { data: existing, error: checkError } = await anonSupabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", productId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existing) {
        // تحديث الكمية
        const { data: updated, error: updateError } = await anonSupabase
          .from("cart_items")
          .update({
            quantity: existing.quantity + quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return { action: "updated", item: updated };
      }

      // إضافة عنصر جديد
      const { data: newItem, error: insertError } = await anonSupabase
        .from("cart_items")
        .insert({
          cart_id: cartId,
          product_id: productId,
          quantity,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return { action: "created", item: newItem };
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  },

  /**
   * 📝 تحديث كمية العنصر
   */
  async updateQuantity(cartItemId: string, quantity: number) {
    try {
      if (quantity <= 0) {
        return this.removeItem(cartItemId);
      }

      const anonSupabase = createAnonServerClient();

      const { data, error } = await anonSupabase
        .from("cart_items")
        .update({
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cartItemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      throw error;
    }
  },

  /**
   * ❌ حذف عنصر من السلة
   */
  async removeItem(cartItemId: string) {
    try {
      const anonSupabase = createAnonServerClient();

      const { error } = await anonSupabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error removing item:", error);
      throw error;
    }
  },

  /**
   * 🗑️ مسح جميع عناصر السلة
   */
  async clearCart(cartId: string) {
    try {
      const anonSupabase = createAnonServerClient();

      const { error } = await anonSupabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  },

  /**
   * 📊 الحصول على السلة مع تفاصيل المنتجات
   */
  async getCartWithProductDetails(cartId: string) {
    try {
      const anonSupabase = createAnonServerClient();

      const { data: cartItems, error: itemsError } = await anonSupabase
        .from("cart_items")
        .select("id, product_id, quantity, created_at")
        .eq("cart_id", cartId);

      if (itemsError) throw itemsError;

      if (!cartItems || cartItems.length === 0) return [];

      // جلب تفاصيل المنتجات
      const productIds = cartItems.map((item) => item.product_id);
      const { data: products, error: productsError } = await anonSupabase
        .from("products")
        .select(
          "id, name_ar, name_en, price, image_url, stock, is_active"
        )
        .in("id", productIds);

      if (productsError) throw productsError;

      // دمج البيانات
      return cartItems.map((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        return {
          cartItemId: item.id,
          product: {
            id: product?.id,
            name: product?.name_ar || product?.name_en,
            price: product?.price || 0,
            image: product?.image_url,
            stock: product?.stock || 0,
            isActive: product?.is_active,
          },
          quantity: item.quantity,
          subtotal: (product?.price || 0) * item.quantity,
        };
      });
    } catch (error: any) {
      console.error("Error getting cart with products:", error);
      throw error;
    }
  },

  /**
   * 💰 حساب إجمالي السلة
   */
  async getCartTotal(cartId: string) {
    try {
      const items = await this.getCartWithProductDetails(cartId);
      return items.reduce((sum, item) => sum + item.subtotal, 0);
    } catch (error: any) {
      console.error("Error calculating cart total:", error);
      return 0;
    }
  },
};