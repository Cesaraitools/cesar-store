"use client";

import { useEffect, useMemo, useState } from "react";

type OrdersPerDay = {
  day: string;
  orders_count: number;
};

type RevenuePerDay = {
  day: string;
  currency: string;
  revenue: number;
};

type LifecycleDurations = {
  order_id: string;
  time_to_confirm: string | null;
  time_to_ship: string | null;
  time_to_deliver: string | null;
};

type OrdersIndexRow = {
  order_id: string;
  order_number: string;
  user_id: string | null;
  created_at: string;
  current_status: string | null;
  status_at: string | null;
};

type ProductSalesRow = {
  product_id: string;
  product_name: string;
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

type CategorySalesRow = {
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

type ProductOption = {
  id: string;
  name: string;
  category: string;
};

type AnalyticsResponse = {
  volume: {
    total_orders: number;
  };
  financials: Array<{
    currency: string;
    revenue_sum: number;
    avg_order_value: number;
  }>;
  reliability: {
    cancel_rate: number;
    total_orders: number;
  };
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

type FiltersState = {
  from: string;
  to: string;
  status: string;
  category: string;
  productId: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG");
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG");
}

function downloadCSV(rows: OrdersIndexRow[]) {
  const headers = [
    "order_id",
    "order_number",
    "user_id",
    "created_at",
    "current_status",
    "status_at",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.order_id,
        row.order_number,
        row.user_id ?? "",
        row.created_at,
        row.current_status ?? "",
        row.status_at ?? "",
      ]
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

function formatFinancialList(
  rows: Array<{ currency: string; revenue_sum?: number; avg_order_value?: number }>,
  key: "revenue_sum" | "avg_order_value"
) {
  if (!rows.length) return "—";

  return rows
    .map((row) => `${Number(row[key] || 0).toFixed(2)} ${row.currency}`)
    .join(" | ");
}

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "requested", label: "requested" },
  { value: "confirmed", label: "confirmed" },
  { value: "preparing", label: "preparing" },
  { value: "shipped", label: "shipped" },
  { value: "delivered", label: "delivered" },
  { value: "canceled", label: "canceled" },
];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersState>({
    from: "",
    to: "",
    status: "",
    category: "",
    productId: "",
  });

  const pageSize = 10;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.status) params.set("status", filters.status);
        if (filters.category) params.set("category", filters.category);
        if (filters.productId) params.set("productId", filters.productId);

        const query = params.toString();
        const res = await fetch(
          `/api/admin/analytics${query ? `?${query}` : ""}`
        );

        if (!res.ok) throw new Error("Failed to load analytics");

        const json = (await res.json()) as AnalyticsResponse;
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err.message ?? "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const paginatedOrders = useMemo(() => {
    if (!data) return [];
    const start = (page - 1) * pageSize;
    return data.ordersIndex.slice(start, start + pageSize);
  }, [data, page]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.ordersIndex.length / pageSize))
    : 1;

  const topProduct = data?.productSales[0];
  const topCategory = data?.categorySales[0];
  const avgConfirmTime = data?.lifecycle.find(
    (row) => row.time_to_confirm
  )?.time_to_confirm;

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        جاري تحميل التحليلات...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-sm text-red-600">
        تعذر تحميل بيانات التحليلات
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">لوحة التحليلات</h1>
        <p className="text-sm text-muted-foreground">
          متابعة أداء الطلبات والمبيعات حسب الصنف والقسم
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">فلاتر التحليل</h2>
          <button
            onClick={() =>
              setFilters({
                from: "",
                to: "",
                status: "",
                category: "",
                productId: "",
              })
            }
            className="text-sm border rounded-md px-3 py-1 hover:bg-muted"
          >
            تصفير الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <FilterField label="من تاريخ">
            <input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </FilterField>

          <FilterField label="إلى تاريخ">
            <input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </FilterField>

          <FilterField label="الحالة">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
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

          <FilterField label="القسم">
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  category: e.target.value,
                  productId: "",
                }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">كل الأقسام</option>
              {data.categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="الصنف">
            <select
              value={filters.productId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, productId: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">كل الأصناف</option>
              {data.productOptions
                .filter((product) =>
                  filters.category
                    ? product.category === filters.category
                    : true
                )
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </option>
                ))}
            </select>
          </FilterField>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard label="إجمالي الطلبات" value={data.volume.total_orders} />
        <KpiCard
          label="إجمالي المبيعات"
          value={formatFinancialList(data.financials, "revenue_sum")}
        />
        <KpiCard
          label="متوسط الطلب"
          value={formatFinancialList(data.financials, "avg_order_value")}
        />
        <KpiCard
          label="نسبة الإلغاء"
          value={`${(data.reliability.cancel_rate * 100).toFixed(1)}%`}
        />
        <KpiCard
          label="أفضل صنف"
          value={topProduct ? topProduct.product_name : "—"}
          hint={
            topProduct
              ? `${topProduct.units_sold} قطعة | ${topProduct.gross_sales.toFixed(
                  2
                )} ${topProduct.currency}`
              : undefined
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryCard
          title="ملخص الأقسام"
          subtitle={
            topCategory
              ? `الأعلى: ${topCategory.category} | ${topCategory.gross_sales.toFixed(
                  2
                )} ${topCategory.currency}`
              : "لا توجد بيانات مبيعات أقسام بعد"
          }
        >
          <DataTable
            headers={["القسم", "الطلبات", "الكمية", "المبيعات"]}
            rows={data.categorySales.map((row) => [
              row.category,
              String(row.orders_count),
              String(row.units_sold),
              `${row.gross_sales.toFixed(2)} ${row.currency}`,
            ])}
            emptyMessage="لا توجد مبيعات أقسام ضمن الفلاتر الحالية"
          />
        </SummaryCard>

        <SummaryCard
          title="ملخص الأصناف"
          subtitle={
            avgConfirmTime
              ? `متوسط أول مدة تأكيد مرصودة: ${avgConfirmTime}`
              : "لا توجد مدد دورة كافية بعد"
          }
        >
          <DataTable
            headers={["الصنف", "القسم", "الطلبات", "الكمية", "المبيعات"]}
            rows={data.productSales.map((row) => [
              row.product_name,
              row.category,
              String(row.orders_count),
              String(row.units_sold),
              `${row.gross_sales.toFixed(2)} ${row.currency}`,
            ])}
            emptyMessage="لا توجد مبيعات أصناف ضمن الفلاتر الحالية"
          />
        </SummaryCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">الطلبات</h2>
          <button
            onClick={() => downloadCSV(data.ordersIndex)}
            className="text-sm border rounded-md px-3 py-1 hover:bg-muted"
          >
            تصدير CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-right">رقم الطلب</th>
                <th className="px-3 py-2 text-right">المستخدم</th>
                <th className="px-3 py-2 text-right">تاريخ الإنشاء</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((row) => (
                <tr key={row.order_id} className="border-t">
                  <td className="px-3 py-2">{row.order_number}</td>
                  <td className="px-3 py-2">{row.user_id ?? "—"}</td>
                  <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.current_status} />
                  </td>
                  <td className="px-3 py-2">{formatDateTime(row.status_at)}</td>
                </tr>
              ))}

              {!paginatedOrders.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    لا توجد طلبات مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>
            صفحة {page} من {totalPages}
          </span>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              السابق
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      </section>
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

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold break-words">{value}</div>
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 space-y-4">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function DataTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: string[][];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-right">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="border-t">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;

  const color =
    status === "delivered"
      ? "bg-green-100 text-green-700"
      : status === "canceled"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}
