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
    case "requested": return "تم استلام الطلب";
    case "confirmed": return "تم تأكيد الطلب";
    case "preparing": return "جاري التحضير";
    case "shipped": return "تم الشحن";
    case "delivered": return "تم التسليم";
    case "canceled": return "تم إلغاء الطلب";
    default: return "غير معروف";
  }
}

function statusColor(status: string | null) {
  switch (status) {
    case "delivered": return "bg-green-100 text-green-700";
    case "canceled": return "bg-red-100 text-red-700";
    default: return "bg-blue-100 text-blue-700";
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        load(); 
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* -------- Pagination Logic -------- */
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  
  // تأكدنا هنا من استخدام paginatedOrders للعرض بدلاً من orders
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return orders.slice(start, start + itemsPerPage);
  }, [orders, currentPage]);

  if (loading) return <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">جاري تحميل الطلبات…</div>;
  if (error) return <div className="p-6 text-center text-sm text-red-600 font-bold">⚠️ حدث خطأ أثناء تحميل الطلبات</div>;

  if (!orders.length) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-sm text-muted-foreground">لا توجد طلبات حتى الآن</p>
        <Link href="/" className="inline-block text-sm underline text-blue-600">تصفح المنتجات</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-right" dir="rtl">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-black text-slate-900">طلباتي</h1>
        <p className="text-xs text-slate-500 mt-1">إدارة ومتابعة جميع طلباتك السابقة</p>
      </header>

      {/* قائمة الطلبات المجزأة */}
      <div className="space-y-4">
        {paginatedOrders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                طلب رقم <span className="text-blue-600">#{order.order_number}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {formatDate(order.created_at)}
              </div>
              <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold ${statusColor(order.status)}`}>
                {statusLabel(order.status)}
              </span>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="text-sm font-black text-slate-900">
                {order.total.toFixed(2)} <span className="text-[10px] text-slate-400 mr-1">{order.currency}</span>
              </div>
              <Link href={`/orders/${order.id}`} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                عرض التفاصيل
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* أزرار التنقل - Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-8" dir="ltr">
          <button 
            onClick={() => setCurrentPage(1)} 
            disabled={currentPage === 1}
            className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-20 hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
          >
            <ChevronFirst size={18} />
          </button>
          
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm"
          >
             السابق <ChevronRight size={16} />
          </button>

          <div className="flex items-center gap-1.5 mx-2">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              // إخفاء الصفحات البعيدة إذا كان العدد كبيراً جداً
              if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="text-slate-300">...</span>;
                return null;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? "bg-blue-600 text-white shadow-lg shadow-blue-100 border-blue-600" : "bg-white border border-slate-200 text-slate-500 hover:border-blue-400 shadow-sm"}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronLeft size={16} /> التالي
          </button>

          <button 
            onClick={() => setCurrentPage(totalPages)} 
            disabled={currentPage === totalPages}
            className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-20 hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
          >
            <ChevronLast size={18} />
          </button>
        </div>
      )}
    </div>
  );
}