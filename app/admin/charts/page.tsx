"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  LineChart,
  TrendingUp,
} from "lucide-react";

type CategorySalesRow = {
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

type AnalyticsResponse = {
  volume: { total_orders: number };
  reliability: { cancel_rate: number };
  financials: Array<{ currency: string; revenue_sum: number }>;
  categorySales: CategorySalesRow[];
};

type FiltersState = { from: string; to: string; status: string };

const EMPTY_FILTERS: FiltersState = { from: "", to: "", status: "" };

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "requested", label: "requested" },
  { value: "confirmed", label: "confirmed" },
  { value: "preparing", label: "preparing" },
  { value: "shipped", label: "shipped" },
  { value: "delivered", label: "delivered" },
  { value: "canceled", label: "canceled" },
];

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

export default function AdminChartsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);

  useEffect(() => {
    let mounted = true;
    async function loadCharts() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.status) params.set("status", filters.status);
        
        const res = await fetch(`/api/admin/analytics${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load charts");
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCharts();
    return () => { mounted = false; };
  }, [filters]);

  const groupedCategorySales = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, CategorySalesRow[]>();
    for (const row of data.categorySales) {
      const current = groups.get(row.currency) || [];
      current.push(row);
      groups.set(row.currency, current);
    }
    return Array.from(groups.entries()).map(([currency, rows]) => ({ currency, rows }));
  }, [data]);

  if (loading) return <div className="p-20 text-center font-black text-blue-600 animate-pulse">جاري تحميل الرسومات...</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4 md:p-8 space-y-8" dir="rtl">
      <header className="flex flex-col lg:flex-row justify-between gap-6 bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900">مبيعات الأقسام</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">تحليل بصري دقيق للأداء</p>
        </div>
        <Link href="/admin/analytics" className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">
          العودة للتحليلات <ArrowRight size={18} className="rotate-180"/>
        </Link>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="إجمالي الطلبات" value={String(data?.volume.total_orders)} icon={<Boxes />} color="from-blue-500 to-indigo-600" />
        <MetricCard title="نسبة الإلغاء" value={`${(data?.reliability.cancel_rate || 0 * 100).toFixed(1)}%`} icon={<TrendingUp />} color="from-rose-500 to-orange-600" />
        <MetricCard title="أفضل قسم" value={data?.categorySales[0]?.category || "—"} icon={<BarChart3 />} color="from-amber-500 to-orange-500" />
        <MetricCard title="العملات النشطة" value={String(data?.financials.length)} icon={<LineChart />} color="from-emerald-500 to-teal-600" />
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {groupedCategorySales.map((group) => (
          <div key={group.currency} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-800 border-r-4 border-indigo-600 pr-4">مبيعات ({group.currency})</h2>
            <CategoryBars rows={group.rows} mode="sales" />
            <div className="pt-4 border-t border-slate-50">
               <h2 className="text-xl font-black text-slate-800 border-r-4 border-blue-600 pr-4 mb-8">كميات ({group.currency})</h2>
               <CategoryBars rows={group.rows} mode="units" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: any) {
  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] p-6 text-white shadow-lg bg-gradient-to-br ${color}`}>
      <div className="absolute top-[-10%] right-[-10%] opacity-20 transform scale-150">{icon}</div>
      <div className="relative z-10 space-y-1">
        <p className="text-[10px] font-black uppercase opacity-80">{title}</p>
        <p className="text-2xl font-black truncate">{value}</p>
      </div>
    </div>
  );
}

function CategoryBars({ rows, mode }: { rows: CategorySalesRow[]; mode: "sales" | "units" }) {
  const maxValue = Math.max(...rows.map((row) => (mode === "sales" ? row.gross_sales : row.units_sold)), 0);
  return (
    <div className="space-y-6">
      {rows.map((row) => {
        const value = mode === "sales" ? row.gross_sales : row.units_sold;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={`${row.category}-${mode}`} className="group">
            <div className="flex justify-between items-end mb-2">
              <span className="font-black text-slate-700 text-sm uppercase">{row.category}</span>
              <span className="font-black text-indigo-600">
                {mode === "sales" ? formatMoney(value, row.currency) : `${value} قطعة`}
              </span>
            </div>
            <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
              <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${mode === 'sales' ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-500'}`} style={{ width: `${Math.max(percentage, 5)}%` }}></div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-1">{row.orders_count} طلبات</div>
          </div>
        );
      })}
    </div>
  );
}