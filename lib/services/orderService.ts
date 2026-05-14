// lib/services/orderService.ts - النسخة الصحيحة

import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const orderService = {
  /**
   * 📋 إنشاء طلب جديد
   */
  async createOrder(
    userId: string,
    cartId: string,
    customerData: {
      name: string;
      phone: string;
      address: string;
      city?: string;
      notes?: string;
    },
    items: Array<{
      product_id: string;
      name: string;
      price: number;
      quantity: number;
      image?: string;
    }>,
    options?: {
      shipping_fee?: number;
      discount?: number;
      currency?: string;
    }
  ) {
    try {
      const serviceSupabase = createServiceRoleClient();

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const currency = options?.currency ?? "EGP";
      const atomicItems = items.map((item) => ({
        product_id: String(item.product_id),
        name_ar: item.name,
        name_en: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image ?? null,
      }));

      const { data, error } = await serviceSupabase.rpc("create_order_atomic", {
        p_user_id: userId,
        p_items: atomicItems,
        p_customer: customerData,
        p_currency: currency,
        p_order_token: crypto.randomUUID(),
      });

      if (error) throw error;

      const order = Array.isArray(data) ? data[0] : data;

      if (!order?.order_id) {
        throw new Error("Order creation returned no data");
      }

      return {
        id: order.order_id,
        order_number: order.order_number,
        status: "requested",
        subtotal,
        total: subtotal,
        currency,
      };
    } catch (error: any) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  /**
   * 📊 الحصول على طلبات المستخدم
   */
  async getUserOrders(userId: string) {
    try {
      const serviceSupabase = createServiceRoleClient();

      const { data: orders, error } = await serviceSupabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          total,
          subtotal,
          currency,
          created_at,
          customer_snapshot,
          order_tracking_events (
            status,
            created_at,
            actor,
            note
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return orders || [];
    } catch (error: any) {
      console.error("Error getting user orders:", error);
      throw error;
    }
  },

  /**
   * 🔍 الحصول على تفاصيل طلب محدد
   */
  async getOrderDetails(orderId: string, userId: string) {
    try {
      const serviceSupabase = createServiceRoleClient();

      const { data: order, error } = await serviceSupabase
        .from("orders")
        .select(
          `
          *,
          order_items (*),
          order_tracking_events (*),
          invoices (*)
        `
        )
        .eq("id", orderId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error("Order not found");
        }
        throw error;
      }

      return order;
    } catch (error: any) {
      console.error("Error getting order details:", error);
      throw error;
    }
  },

  /**
   * 📝 تحديث حالة الطلب (Admin فقط)
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string
  ) {
    try {
      const serviceSupabase = createServiceRoleClient();

      // التحقق من صحة الحالة
      const validStatuses = [
        "requested",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "canceled",
      ];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      // تحديث الطلب
      const { error: updateError } = await serviceSupabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === "confirmed" && {
            confirmed_at: new Date().toISOString(),
          }),
          ...(["delivered", "canceled"].includes(status) && {
            closed_at: new Date().toISOString(),
          }),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // إضافة tracking event
      const { error: trackingError } = await serviceSupabase
        .from("order_tracking_events")
        .insert({
          order_id: orderId,
          status,
          actor: "admin",
          note: note || "",
        });

      if (trackingError) {
        console.warn("Warning: Failed to create tracking event:", trackingError);
      }

      return { success: true, status };
    } catch (error: any) {
      console.error("Error updating order status:", error);
      throw error;
    }
  },

  /**
   * 🔄 إعادة محاولة تنفيذ طلب فاشل
   */
  async retryFailedOrder(orderId: string) {
    try {
      const serviceSupabase = createServiceRoleClient();

      const { error } = await serviceSupabase
        .from("orders")
        .update({
          status: "requested",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      // إضافة tracking event
      await serviceSupabase.from("order_tracking_events").insert({
        order_id: orderId,
        status: "requested",
        actor: "admin",
        note: "تم إعادة محاولة الطلب",
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error retrying order:", error);
      throw error;
    }
  },
};
