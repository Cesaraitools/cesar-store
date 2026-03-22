"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, ChevronLast, ChevronFirst } from "lucide-react";

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

  /* -------- Pagination State -------- */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    const channel = supabase
      .channel("orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          load(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* -------- Pagination Logic -------- */
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return orders.slice(start, start + itemsPerPage);
  }, [orders, currentPage]);

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
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-right" dir="rtl">
      <header>
        <h1 className="text-2xl font-semibold">طلباتي</h1>
      </header>

      <div className="space-y-4">
        {paginatedOrders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white"
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
                className="text-sm underline text-blue-600 font-medium"
              >
                عرض التفاصيل
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 border-t pt-6" dir="ltr">
          <button 
            onClick={() => setCurrentPage(1)} 
            disabled={currentPage === 1}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            <ChevronFirst size={18} />
          </button>
          
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
             السابق <ChevronRight size={16} />
          </button>

          <div className="flex items-center gap-1 mx-2">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? "bg-blue-600 text-white shadow-sm" : "bg-white border hover:bg-gray-50 text-gray-600"}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} /> التالي
          </button>

          <button 
            onClick={() => setCurrentPage(totalPages)} 
            disabled={currentPage === totalPages}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            <ChevronLast size={18} />
          </button>
        </div>
      )}
    </div>
  );
}