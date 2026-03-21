"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase, unsubscribeFromChannel } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Package,
  Calendar,
  ChevronLeft
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

/* ---------------- Pagination ---------------- */
const PAGE_SIZE = 10;

/* ---------------- Status Helpers ---------------- */
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

/* ---------------- CSV Helper ---------------- */
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
  const [page, setPage] = useState(1);

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
    return orders.filter((o) => {
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
  }, [orders, statusFilter, fromDate, toDate, search]);

  /* -------- Pagination Logic -------- */
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, fromDate, toDate, search]);

  if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-bold">جاري تحميل لوحة الطلبات...</div>;
  if (error) return <div className="p-20 text-center text-rose-600">{error}</div>;

  const delivered = filteredOrders.filter(o => o.status === "delivered");
  const revenue = delivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-8 text-right" dir="rtl">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">سجل الطلبات اللحظي</h1>
        </div>
        <button onClick={() => exportOrdersToCSV(filteredOrders)} className="flex items-center gap-2 bg-white border px-5 py-2.5 rounded-xl text-sm font-bold">
          <Download className="w-4 h-4" />
          تصدير
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl flex gap-4 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="p-2 bg-gray-50 rounded-xl"/>
        <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
          <option value="all">الكل</option>
          {Object.entries(STATUS_LABELS).map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border overflow-hidden">
        <table className="w-full">
          <tbody>
            {paginatedOrders.map(o=>(
              <tr key={o.id}>
                <td>{o.customer_snapshot?.name}</td>
                <td><StatusBadge status={o.status}/></td>
                <td><Link href={`/admin/orders/${o.id}`}>التفاصيل</Link></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between p-4">
            <button onClick={()=>setPage(p=>Math.max(p-1,1))} disabled={page===1}>
              السابق
            </button>
            <div>صفحة {page} من {totalPages}</div>
            <button onClick={()=>setPage(p=>Math.min(p+1,totalPages))} disabled={page===totalPages}>
              التالي
            </button>
          </div>
        )}

      </div>
    </div>
  );
}