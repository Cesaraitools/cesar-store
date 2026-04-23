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
  volume: {
    total_orders: number;
  };
  reliability: {
    cancel_rate: number;
  };
  financials: Array<{
    currency: string;
    revenue_sum: number;
  }>;
  categorySales: CategorySalesRow[];
};

type FiltersState = {
  from: string;
  to: string;
  status: string;
};

const EMPTY_FILTERS: FiltersState = {
  from: "",
  to: "",
  status: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "requested", label: "requested" },
  { value: "confirmed", label: "confirmed" },
  { value: "preparing", label: "preparing" },
  { value: "shipped", label: "shipped" },
  { value: "delivered", label: "delivered" },
  { value: "canceled", label: "canceled" },
];

function buildAnalyticsQuery(filters: FiltersState) {
  const params = new URLSearchParams();

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);

  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatMoney(value: number, currency: string) {
  return `${value.toFixed(2)} ${currency}`;
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
        setError(null);

        const res = await fetch(
          `/api/admin/analytics${buildAnalyticsQuery(filters)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Failed to load charts");
        }

        const json = (await res.json()) as AnalyticsResponse;

        if (mounted) {
          setData(json);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message ?? "Unknown error");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCharts();

    return () => {
      mounted = false;
    };
  }, [filters]);

  const groupedCategorySales = useMemo(() => {
    if (!data) return [];

    const groups = new Map<string, CategorySalesRow[]>();

    for (const row of data.categorySales) {
      const current = groups.get(row.currency) || [];
      current.push(row);
      groups.set(row.currency, current);
    }

    return Array.from(groups.entries()).map(([currency, rows]) => ({
      currency,
      rows,
    }));
  }, [data]);

  const topCategory = data?.categorySales[0];

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        جاري تحميل الرسومات البيانية...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-sm text-red-600">
        تعذر تحميل الرسومات البيانية
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">رسومات مبيعات الأقسام</h1>
          <p className="text-sm text-muted-foreground">
            مقارنة بصرية بين الأقسام حسب المبيعات والكميات بدون الاعتماد على
            مكتبة خارجية.
          </p>
        </div>

        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى التحليلات
        </Link>
      </header>

      <section className="rounded-2xl border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FilterField label="من تاريخ">
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </FilterField>

          <FilterField label="إلى تاريخ">
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </FilterField>

          <FilterField label="الحالة">
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all-statuses"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="إجمالي الطلبات"
          value={String(data.volume.total_orders)}
          icon={<Boxes className="h-5 w-5" />}
        />
        <MetricCard
          title="نسبة الإلغاء"
          value={`${(data.reliability.cancel_rate * 100).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="أفضل قسم"
          value={topCategory?.category || "—"}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          title="إجمالي العملات"
          value={String(data.financials.length)}
          icon={<LineChart className="h-5 w-5" />}
        />
      </section>

      {groupedCategorySales.length ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {groupedCategorySales.map((group) => (
            <ChartCard
              key={`sales-${group.currency}`}
              title={`مقارنة مبيعات الأقسام - ${group.currency}`}
              subtitle="المقارنة هنا حسب قيمة المبيعات الفعلية لكل قسم."
            >
              <CategoryBars rows={group.rows} mode="sales" />
            </ChartCard>
          ))}

          {groupedCategorySales.map((group) => (
            <ChartCard
              key={`units-${group.currency}`}
              title={`مقارنة كميات الأقسام - ${group.currency}`}
              subtitle="المقارنة هنا حسب عدد القطع المباعة داخل كل قسم."
            >
              <CategoryBars rows={group.rows} mode="units" />
            </ChartCard>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
          لا توجد بيانات أقسام لعرضها ضمن الفلاتر الحالية.
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-white p-5">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-2xl border bg-white p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function CategoryBars({
  rows,
  mode,
}: {
  rows: CategorySalesRow[];
  mode: "sales" | "units";
}) {
  const maxValue = Math.max(
    ...rows.map((row) => (mode === "sales" ? row.gross_sales : row.units_sold)),
    0
  );

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const value = mode === "sales" ? row.gross_sales : row.units_sold;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <div key={`${row.category}-${mode}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-900">{row.category}</span>
              <span className="text-slate-500">
                {mode === "sales"
                  ? formatMoney(row.gross_sales, row.currency)
                  : `${row.units_sold} قطعة`}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-sky-500 transition-all"
                style={{ width: `${Math.max(percentage, 6)}%` }}
              />
            </div>
            <div className="text-xs text-slate-400">
              {row.orders_count} طلب
            </div>
          </div>
        );
      })}
    </div>
  );
}
