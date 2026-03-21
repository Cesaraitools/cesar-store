"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================================
   Types (API Contract)
================================ */

type OrderListItem = {
  id: string;
  order_number: string;
  created_at: string;
  status: string | null;
  total: number;
  currency: string;
};

type OrdersResponse = {
  orders: OrderListItem[];
};

/* ================================
   Helpers
================================ */

function statusLabel(status: string | null) {
  switch (status) {
    case "requested":
      return "تم استلام الطلب";
    case "confirmed":
      return "تم تأكيد الطلب";
    case "preparing":
      return "جاري التحضير";
    case "shipped":
      return "تم الشحن";
    case "delivered":
      return "تم التسليم";
    case "canceled":
      return "تم إلغاء الطلب";
    default:
      return "غير معروف";
  }
}

function statusColor(status: string | null) {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-700";
    case "canceled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-EG");
}

/* ================================
   Page
================================ */

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("User not authenticated");

      const res = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load orders");

      const json = (await res.json()) as OrdersResponse;

      setOrders(json.orders ?? []);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 🔥 NEW: REALTIME UPDATE (SAFE)
  useEffect(() => {
    const channel = supabase
      .channel("orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          load(); // فقط نعمل reload — بدون أي تغيير UI
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        جاري تحميل الطلبات…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-600">
        حدث خطأ أثناء تحميل الطلبات
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          لا توجد طلبات حتى الآن
        </p>
        <Link href="/" className="inline-block text-sm underline">
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">طلباتي</h1>
      </header>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium">
                طلب رقم #{order.order_number}
              </div>

              <div className="text-xs text-muted-foreground">
                {formatDate(order.created_at)}
              </div>

              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                  order.status
                )}`}
              >
                {statusLabel(order.status)}
              </span>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
              <div className="text-sm font-semibold">
                {order.total.toFixed(2)} {order.currency}
              </div>

              <Link
                href={`/orders/${order.id}`}
                className="text-sm underline"
              >
                عرض التفاصيل
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}