"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  LineChart,
  RotateCcw,
  Trash2,
  Filter,
  BarChart3,
  Calendar,
  Box,
  LayoutDashboard
} from "lucide-react";

/* ---------------- Types (Unchanged) ---------------- */
type OrdersPerDay = { day: string; orders_count: number; };
type RevenuePerDay = { day: string; currency: string; revenue: number; };
type LifecycleDurations = { order_id: string; time_to_confirm: string | null; time_to_ship: string | null; time_to_deliver: string | null; };
type OrdersIndexRow = { order_id: string; order_number: string; user_id: string | null; created_at: string; current_status: string | null; status_at: string | null; };
type ProductSalesRow = { product_id: string; product_name: string; category: string; currency: string; units_sold: number; orders_count: number; gross_sales: number; };
type CategorySalesRow = { category: string; currency: string; units_sold: number; orders_count: number; gross_sales: number; };
type ProductOption = { id: string; name: string; category: string; };

type AnalyticsResponse = {
  volume: { total_orders: number; };
  financials: Array<{ currency: string; revenue_sum: number; avg_order_value: number; }>;
  reliability: { cancel_rate: number; total_orders: number; };
  ordersPerDay: OrdersPerDay[];
  revenuePerDay: RevenuePerDay[];
  lifecycle: LifecycleDurations[];
  multipleVersions: Array<unknown>;
  ordersIndex: OrdersIndexRow[];
  productSales: ProductSalesRow[];
  categorySales: CategorySalesRow[];
  productOptions: ProductOption[];
  categoryOptions: string[];
};

type FiltersState = { from: string; to: string; status: string; category: string; productId: string; };

const EMPTY_FILTERS: FiltersState = { from: "", to: "", status: "", category: "", productId: "", };

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
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG");
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG");
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

function buildAnalyticsQuery(filters: FiltersState) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.productId) params.set("productId", filters.productId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function downloadCSV(rows: OrdersIndexRow[]) {
  const headers = ["order_id", "order_number", "user_id", "created_at", "current_status", "status_at"];
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [row.order_id, row.order_number, row.user_id ?? "", row.created_at, row.current_status ?? "", row.status_at ?? ""]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "orders_analytics.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function formatFinancialList(rows: Array<{ currency: string; revenue_sum?: number; avg_order_value?: number }>, key: "revenue_sum" | "avg_order_value") {
  if (!rows.length) return "—";
  return rows.map((row) => `${Number(row[key] || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${row.currency}`).join(" | ");
}

/* ---------------- Main Page Component ---------------- */
export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingData, setResettingData] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);

  const pageSize = 10;

  async function loadAnalytics(activeFilters: FiltersState) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/analytics${buildAnalyticsQuery(activeFilters)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = (await res.json()) as AnalyticsResponse;
      setData(json);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAnalytics(filters); }, [filters]);
  useEffect(() => { setPage(1); }, [filters]);

  const paginatedOrders = useMemo(() => {
    if (!data) return [];
    const start = (page - 1) * pageSize;
    return data.ordersIndex.slice(start, start + pageSize);
  }, [data, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.ordersIndex.length / pageSize)) : 1;
  const topProduct = data?.productSales[0];
  const topCategory = data?.categorySales[0];
  const avgConfirmTime = data?.lifecycle.find((row) => row.time_to_confirm)?.time_to_confirm;

  async function handleResetTestData() {
    const firstConfirmation = window.confirm("سيتم حذف كل الطلبات التجريبية وسجل تتبعها مع إعادة المخزون كما كان قبل الاختبار. هل تريد المتابعة؟");
    if (!firstConfirmation) return;
    const secondConfirmation = window.confirm("تأكيد أخير: هذا الإجراء مخصص قبل بدء العمل الفعلي فقط ولا يمكن التراجع عنه من الواجهة. هل نكمل؟");
    if (!secondConfirmation) return;
    try {
      setResettingData(true);
      const res = await fetch("/api/admin/analytics/reset", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذر تصفير البيانات التجريبية");
      setFilters(EMPTY_FILTERS);
      await loadAnalytics(EMPTY_FILTERS);
      alert(`تم تصفير البيانات التجريبية بنجاح.\nعدد الطلبات المحذوفة: ${json.deletedOrders}\nعدد المنتجات التي عاد مخزونها: ${json.restoredProducts}`);
    } catch (err: any) {
      alert(err.message || "تعذر تصفير البيانات التجريبية");
    } finally {
      setResettingData(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">جاري تحميل التحليلات الفنية...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-50 p-3 text-red-600 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">خطأ في التحميل</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{error || "تعذر الاتصال بالخادم لجلب بيانات التحليلات"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8" dir="rtl">
      
      {/* Header Section */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <LayoutDashboard size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">لوحة التحليلات الذكية</h1>
            <p className="text-sm font-medium text-slate-500">رؤية شاملة لأداء متجر سيزر والنمو البيعي.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/charts"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-200 transition-all hover:border-blue-300 hover:text-blue-600 active:scale-95"
          >
            <LineChart className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
            الرسومات البيانية
          </Link>

          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-50 active:scale-95"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" />
            تصفير الفلاتر
          </button>
        </div>
      </header>

      {/* Warning Section - Cleaner Design */}
      <section className="relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm">
        <div className="absolute -right-4 -top-4 text-rose-50 opacity-50">
          <Trash2 size={120} />
        </div>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">منطقة الصيانة وإدارة البيانات</h2>
              <p className="text-sm font-medium leading-relaxed text-slate-500 max-w-2xl">
                يتيح لك هذا الخيار حذف كافة البيانات الناتجة عن عمليات الاختبار (الطلبات وتتبعها) مع استعادة المخزون الأصلي.
              </p>
            </div>
          </div>

          <button
            onClick={handleResetTestData}
            disabled={resettingData || data.volume.total_orders === 0}
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-rose-600 shadow-xl shadow-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            {resettingData ? "جارٍ التجهيز..." : "تصفير بيانات الاختبار"}
          </button>
        </div>
      </section>

      {/* Filters Section - Modern Glassmorphism look */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
           <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Filter size={18} />
           </div>
           <h2 className="text-lg font-bold text-slate-800">تخصيص البيانات</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterField label="من تاريخ" icon={<Calendar size={14}/>}>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-focus focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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

          <FilterField label="حالة الطلب" icon={<Box size={14}/>}>
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

          <FilterField label="القسم العام" icon={<LayoutDashboard size={14}/>}>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, productId: "" }))}
              className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">كل الأقسام</option>
              {data.categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="المنتج المحدد" icon={<Box size={14}/>}>
            <select
              value={filters.productId}
              onChange={(e) => setFilters(prev => ({ ...prev, productId: e.target.value }))}
              className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">كل المنتجات</option>
              {data.productOptions
                .filter(p => filters.category ? p.category === filters.category : true)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </FilterField>
        </div>
      </section>

      {/* KPI Cards - Vibrant Design */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="إجمالي الطلبات" value={data.volume.total_orders} trend="نشط" color="blue" />
        <KpiCard label="حجم المبيعات" value={formatFinancialList(data.financials, "revenue_sum")} trend="مالي" color="emerald" />
        <KpiCard label="متوسط قيمة الطلب" value={formatFinancialList(data.financials, "avg_order_value")} trend="كفاءة" color="violet" />
        <KpiCard label="نسبة الإلغاء" value={`${(data.reliability.cancel_rate * 100).toFixed(1)}%`} trend="جودة" color="rose" />
        <KpiCard 
          label="الأكثر مبيعاً" 
          value={topProduct ? topProduct.product_name : "—"} 
          hint={topProduct ? `${topProduct.units_sold} قطعة | ${formatMoney(topProduct.gross_sales, topProduct.currency)}` : undefined}
          color="amber"
        />
      </section>

      {/* Summary Tables - Compact & Rounded */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SummaryCard 
          title="أداء الأقسام" 
          icon={<BarChart3 size={20} className="text-indigo-600"/>}
          subtitle={topCategory ? `الأفضل: ${topCategory.category}` : "بانتظار البيانات"}
        >
          <DataTable
            headers={["القسم", "الطلبات", "الكمية", "المبيعات"]}
            rows={data.categorySales.map((row) => [
              row.category,
              String(row.orders_count),
              String(row.units_sold),
              formatMoney(row.gross_sales, row.currency),
            ])}
            emptyMessage="لا توجد بيانات للأقسام حالياً"
          />
        </SummaryCard>

        <SummaryCard 
          title="أداء المنتجات" 
          icon={<Box size={20} className="text-orange-600"/>}
          subtitle={avgConfirmTime ? `دورة التأكيد: ${avgConfirmTime}` : "مؤشر السرعة"}
        >
          <DataTable
            headers={["المنتج", "القسم", "الطلبات", "المبيعات"]}
            rows={data.productSales.map((row) => [
              row.product_name,
              row.category,
              String(row.orders_count),
              formatMoney(row.gross_sales, row.currency),
            ])}
            emptyMessage="لا توجد بيانات للمنتجات حالياً"
          />
        </SummaryCard>
      </section>

      {/* Orders Table Section - Large & Professional */}
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Calendar size={20} />
             </div>
             <h2 className="text-xl font-black text-slate-800">سجل الطلبات التفصيلي</h2>
          </div>
          <button
            onClick={() => downloadCSV(data.ordersIndex)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 border border-slate-200 hover:bg-white hover:border-blue-400 transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            تصدير البيانات (CSV)
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-right font-bold text-slate-600">رقم الطلب</th>
                <th className="px-6 py-4 text-right font-bold text-slate-600">هوية العميل</th>
                <th className="px-6 py-4 text-right font-bold text-slate-600">تاريخ الطلب</th>
                <th className="px-6 py-4 text-right font-bold text-slate-600">الحالة</th>
                <th className="px-6 py-4 text-right font-bold text-slate-600">التحديث الأخير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedOrders.map((row) => (
                <tr key={row.order_id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{row.order_number}</td>
                  <td className="px-6 py-4 text-slate-500">{row.user_id ?? "زائر"}</td>
                  <td className="px-6 py-4 text-slate-900 font-medium">{formatDate(row.created_at)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.current_status} />
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs font-medium">{formatDateTime(row.status_at)}</td>
                </tr>
              ))}
              {!paginatedOrders.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">لا توجد طلبات تطابق معايير البحث الحالية</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Modern Minimalist */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <span className="text-sm font-bold text-slate-500">
            عرض الصفحة <span className="text-slate-900">{page}</span> من أصل <span className="text-slate-900">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => prev - 1)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              السابق
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
            >
              التالي
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Helper Components (Refined Style) ---------------- */

function FilterField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode; }) {
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

function KpiCard({ label, value, hint, color }: { label: string; value: string | number; hint?: string; trend?: string; color: string; }) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-100 bg-blue-50/30 text-blue-600",
    emerald: "border-emerald-100 bg-emerald-50/30 text-emerald-600",
    violet: "border-violet-100 bg-violet-50/30 text-violet-600",
    rose: "border-rose-100 bg-rose-50/30 text-rose-600",
    amber: "border-amber-100 bg-amber-50/30 text-amber-600",
  };

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border p-5 shadow-sm bg-white transition-all hover:-translate-y-1`}>
      <div className="relative z-10 space-y-2">
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
        <div className={`text-xl font-black tracking-tight text-slate-900`}>{value}</div>
        {hint && <div className="text-[10px] font-bold text-slate-400 leading-tight border-t border-slate-50 pt-2 mt-2">{hint}</div>}
      </div>
      <div className={`absolute -right-2 -bottom-2 h-16 w-16 rounded-full opacity-10 ${colorMap[color] || ""}`}></div>
    </div>
  );
}

function SummaryCard({ title, icon, subtitle, children }: { title: string; icon: React.ReactNode; subtitle: string; children: React.ReactNode; }) {
  return (
    <section className="flex flex-col space-y-6 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
        </div>
        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-tighter">{subtitle}</span>
      </div>
      {children}
    </section>
  );
}

function DataTable({ headers, rows, emptyMessage }: { headers: string[]; rows: string[][]; emptyMessage: string; }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-50">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-right font-bold text-slate-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 ${j === 0 ? "font-bold text-slate-800" : "text-slate-500 font-medium"}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-300">—</span>;

  const styles: Record<string, string> = {
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    canceled: "bg-rose-50 text-rose-600 border-rose-100",
    requested: "bg-blue-50 text-blue-600 border-blue-100",
    confirmed: "bg-indigo-50 text-indigo-600 border-indigo-100",
    preparing: "bg-amber-50 text-amber-600 border-amber-100",
    shipped: "bg-violet-50 text-violet-600 border-violet-100",
  };

  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[status] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
      {status}
    </span>
  );
}