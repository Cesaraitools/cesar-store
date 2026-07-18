"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { WholesaleOrder, WholesaleOrderStatus } from "@/types/wholesale";

const statusLabels: Record<WholesaleOrderStatus, string> = {
  requested: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "جاري التحضير",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغى",
};

const statusOrder: WholesaleOrderStatus[] = [
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
];

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("ar-EG")} EGP`;
}

function monthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AdminWholesaleChartsPage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/wholesale/orders?status=all");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل طلبات الجملة");
      }

      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    } catch (loadError) {
      console.error("Wholesale charts load failed", loadError);
      setError("فشل تحميل رسوم الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders(true);
  }, []);

  const chartData = useMemo(() => {
    const byStatus = statusOrder.map((status) => ({
      label: statusLabels[status],
      value: orders.filter((order) => order.status === status).length,
    }));
    const byMonth = new Map<string, number>();
    for (const order of orders) {
      const key = monthKey(order.createdAt);
      byMonth.set(key, (byMonth.get(key) || 0) + order.subtotal);
    }

    return {
      byStatus,
      byMonth: Array.from(byMonth.entries()).map(([label, value]) => ({
        label,
        value,
      })),
    };
  }, [orders]);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">رسوم الجملة</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            عرض بصري خفيف لحالة الطلبات وقيمة المبيعات الشهرية.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadOrders(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <BarPanel
            title="الطلبات حسب الحالة"
            rows={chartData.byStatus.map((row) => ({
              label: row.label,
              value: row.value,
              display: row.value.toLocaleString("ar-EG"),
            }))}
          />
          <BarPanel
            title="قيمة الطلبات حسب الشهر"
            rows={chartData.byMonth.map((row) => ({
              label: row.label,
              value: row.value,
              display: formatMoney(row.value),
            }))}
          />
        </div>
      )}
    </div>
  );
}

function BarPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; display: string }>;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.length ? (
          rows.map((row) => (
            <div key={`${title}-${row.label}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
                <span>{row.label}</span>
                <span>{row.display}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
            لا توجد بيانات كافية بعد.
          </p>
        )}
      </div>
    </div>
  );
}
