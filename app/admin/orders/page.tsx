"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase, unsubscribeFromChannel } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { 
  Search, 
  Filter, 
  Download, 
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  ChevronFirst,
  TrendingUp,
  CheckCircle,
  XCircle
} from "lucide-react";

/* ---------------- Types ---------------- */
type OrderRow = {
  id: string;
  total: number;
  currency: string;
  created_at: string;
  status: string;
  customer_snapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

type TrackingEvent = {
  order_id: string;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  requested: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "جاري التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغى",
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    shipped: "bg-blue-50 text-blue-600 border-blue-100",
    preparing: "bg-amber-50 text-amber-600 border-amber-100",
    confirmed: "bg-purple-50 text-purple-600 border-purple-100",
    requested: "bg-slate-50 text-slate-600 border-slate-100",
    canceled: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function exportOrdersToCSV(rows: OrderRow[]) {
  if (!rows.length) return;
  const headers = ["ID", "Customer", "Status", "Total", "Currency", "Date"];
  const csvRows = [
    headers.join(","),
    ...rows.map((o) => [
      o.id,
      o.customer_snapshot?.name || "",
      STATUS_LABELS[o.status] || o.status,
      o.total,
      o.currency,
      new Date(o.created_at).toISOString(),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* -------- Filters -------- */
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  /* -------- Pagination State -------- */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // عدد الطلبات في كل صفحة

  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/orders");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch {
        setError("تعذر تحميل الطلبات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!orders.length) return;
    const channel = supabase
      .channel("admin-orders-tracking")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_tracking_events" }, (payload) => {
        const event = payload.new as TrackingEvent;
        setOrders(prev => prev.map(o => o.id === event.order_id ? { ...o, status: event.status } : o));
      })
      .subscribe();
    channelsRef.current.push(channel);
    return () => {
      channelsRef.current.forEach(unsubscribeFromChannel);
      channelsRef.current = [];
    };
  }, [orders.length]);

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (fromDate && new Date(o.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(o.created_at) > new Date(toDate)) return false;
      if (search) {
        const q = search.toLowerCase();
        const inId = o.id.toLowerCase().includes(q);
        const inName = o.customer_snapshot?.name?.toLowerCase().includes(q) ?? false;
        if (!inId && !inName) return false;
      }
      return true;
    });
    // إعادة التعيين للصفحة الأولى عند تغيير الفلاتر
    return filtered;
  }, [orders, statusFilter, fromDate, toDate, search]);

  // منطق تقسيم الصفحات
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, fromDate, toDate, search]);

  if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-bold">جاري تحميل لوحة الطلبات...</div>;
  if (error) return <div className="p-20 text-center text-rose-600">{error}</div>;

  const delivered = orders.filter(o => o.status === "delivered");
  const revenue = delivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">سجل الطلبات اللحظي</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            متابعة حركة المبيعات وتحديثات الشحن مباشرة
          </p>
        </div>
        <button 
          onClick={() => exportOrdersToCSV(filteredOrders)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-blue-600" />
          تصدير البيانات (CSV)
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="إجمالي الطلبات" value={orders.length} icon={<Package />} color="blue" />
        <MetricCard title="طلبات مكتملة" value={delivered.length} icon={<CheckCircle />} color="emerald" />
        <MetricCard title="طلبات ملغاة" value={orders.filter(o => o.status === "canceled").length} icon={<XCircle />} color="rose" />
        <MetricCard title="الإيرادات" value={`${revenue.toLocaleString()} ${orders[0]?.currency || "EGP"}`} icon={<TrendingUp />} color="blue" isBold />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="بحث بالرقم أو الاسم..." 
            className="w-full pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            className="bg-transparent border-none text-sm font-bold text-gray-600 focus:ring-0"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">جميع الحالات</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" className="bg-gray-50 border-none rounded-xl text-xs font-medium p-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="text-gray-300">←</span>
          <input type="date" className="bg-gray-50 border-none rounded-xl text-xs font-medium p-2" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">رقم الطلب</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">القيمة</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5 font-mono text-xs text-blue-600 font-bold">#{o.id.slice(0, 8)}</td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-gray-900">{o.customer_snapshot?.name || "—"}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{o.customer_snapshot?.phone || o.customer_snapshot?.email}</div>
                  </td>
                  <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                    {new Date(o.created_at).toLocaleDateString("ar-EG", { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-5 font-black text-sm text-gray-900">
                    {Number(o.total).toLocaleString()} <span className="text-[10px] text-gray-400 mr-0.5">{o.currency}</span>
                  </td>
                  <td className="px-6 py-5"><StatusBadge status={o.status} /></td>
                  <td className="px-6 py-5 text-left">
                    <Link href={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                      التفاصيل <ChevronLeft className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-3">
            <Package className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400 text-sm font-medium italic">لا توجد طلبات تطابق معايير البحث.</p>
          </div>
        )}

        {/* أزرار التنقل (Pagination Buttons) */}
        {totalPages > 1 && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-gray-400">
              عرض {paginatedOrders.length} من أصل {filteredOrders.length} طلب
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                <ChevronLast size={16} className="text-gray-600" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                السابق <ChevronRight size={14} />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // عرض الصفحات القريبة فقط إذا كان العدد كبيراً
                  if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={14} /> التالي
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                <ChevronFirst size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, isBold }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <p className={`text-2xl font-black ${isBold ? "text-blue-600" : "text-gray-900"}`}>{value}</p>
      </div>
    </div>
  );
}