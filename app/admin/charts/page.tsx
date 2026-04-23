"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  LineChart,
  TrendingUp,
  Calendar,
  Filter,
  ArrowLeft,
  Sparkles
} from "lucide-react";

/* ---------------- Types (Unchanged) ---------------- */
type CategorySalesRow = {
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

type AnalyticsResponse = {
  volume: { total_orders: number; };
  reliability: { cancel_rate: number; };
  financials: Array<{ currency: string; revenue_sum: number; }>;
  categorySales: CategorySalesRow[];
};

type FiltersState = { from: string; to: string; status: string; };

const EMPTY_FILTERS: FiltersState = { from: "", to: "", status: "", };

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "requested", label: "requested" },
  { value: "confirmed", label: "confirmed" },
  { value: "preparing", label: "preparing" },
  { value: "shipped", label: "shipped" },
  { value: "delivered", label: "delivered" },
  { value: "canceled", label: "canceled" },
];

/* ---------------- Helper Functions (Unchanged Logic) ---------------- */
function buildAnalyticsQuery(filters: FiltersState) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

/* ---------------- Main Component ---------------- */
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
        setError(null);
        const res = await fetch(`/api/admin/analytics${buildAnalyticsQuery(filters)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load charts");
        const json = (await res.json()) as AnalyticsResponse;
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err.message ?? "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCharts();
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

  const topCategory = data?.categorySales[0];

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">جاري تحليل البيانات بصرياً...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-50 p-3 text-red-600 mb-4">
          <LineChart size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">خطأ في جلب البيانات</h3>
        <p className="text-sm text-slate-500 mt-1">تأكد من اتصالك بالخادم وحاول مجدداً.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8" dir="rtl">
      
      {/* Header Section */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <LineChart size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تحليل مبيعات الأقسام</h1>
            <p className="text-sm font-medium text-slate-500">تمثيل بصري لأداء الفئات وتدفق المبيعات.</p>
          </div>
        </div>

        <Link
          href="/admin/analytics"
          className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-200 transition-all hover:border-blue-300 hover:text-blue-600 active:scale-95"
        >
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          العودة للتحليلات
        </Link>
      </header>

      {/* Filters Section */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
           <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Filter size={18} />
           </div>
           <h2 className="text-lg font-bold text-slate-800">تصفية النتائج البصرية</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FilterField label="من تاريخ" icon={<Calendar size={14}/>}>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </FilterField>

          <FilterField label="إلى تاريخ" icon={<Calendar size={14}/>}>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </FilterField>

          <FilterField label="حالة الطلبات" icon={<Sparkles size={14}/>}>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FilterField>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="إجمالي الطلبات" value={data.volume.total_orders} icon={<Boxes size={20}/>} color="blue" />
        <MetricCard title="نسبة الإلغاء" value={`${(data.reliability.cancel_rate * 100).toFixed(1)}%`} icon={<TrendingUp size={20}/>} color="rose" />
        <MetricCard title="أفضل فئة" value={topCategory?.category || "—"} icon={<BarChart3 size={20}/>} color="amber" />
        <MetricCard title="تعدد العملات" value={data.financials.length} icon={<LineChart size={20}/>} color="emerald" />
      </section>

      {/* Charts Section */}
      {groupedCategorySales.length ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {groupedCategorySales.map((group) => (
            <ChartCard
              key={`sales-${group.currency}`}
              title={`مبيعات الأقسام (${group.currency})`}
              subtitle="تحليل مالي للقيمة الإجمالية لكل قسم"
              icon={<Sparkles size={18} className="text-emerald-500"/>}
            >
              <CategoryBars rows={group.rows} mode="sales" />
            </ChartCard>
          ))}

          {groupedCategorySales.map((group) => (
            <ChartCard
              key={`units-${group.currency}`}
              title={`كميات الأقسام (${group.currency})`}
              subtitle="تحليل كمي لعدد القطع المباعة"
              icon={<Boxes size={18} className="text-blue-500"/>}
            >
              <CategoryBars rows={group.rows} mode="units" />
            </ChartCard>
          ))}
        </div>
      ) : (
        <div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <LineChart size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400">لا توجد بيانات متاحة للعرض ضمن هذه الفلاتر</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Helper Components ---------------- */

function FilterField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string; }) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm transition-all hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function CategoryBars({ rows, mode }: { rows: CategorySalesRow[]; mode: "sales" | "units"; }) {
  const maxValue = Math.max(...rows.map((row) => (mode === "sales" ? row.gross_sales : row.units_sold)), 0);

  return (
    <div className="space-y-6">
      {rows.map((row) => {
        const value = mode === "sales" ? row.gross_sales : row.units_sold;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <div key={`${row.category}-${mode}`} className="group space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="font-black text-slate-800">{row.category}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{row.orders_count} طلب</span>
              </div>
              <span className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                {mode === "sales" ? formatMoney(row.gross_sales, row.currency) : `${row.units_sold} قطعة`}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                  mode === "sales" 
                  ? "bg-gradient-to-l from-emerald-500 to-teal-400" 
                  : "bg-gradient-to-l from-blue-600 to-sky-400"
                }`}
                style={{ width: `${Math.max(percentage, 8)}%` }}
              >
                <div className="w-full h-full bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}