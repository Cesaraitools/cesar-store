"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import type {
  WholesaleOrder,
  WholesaleProductSettingProduct,
} from "@/types/wholesale";

type SummaryPayload = {
  orders: {
    total: number;
    requested: number;
    delivered: number;
    canceled: number;
    revenue: number;
    deliveredRevenue: number;
    averageOrderValue: number;
  };
  returns: { records: number; returnedUnits: number };
  products: { total: number; enabled: number; disabled: number; missingPrice: number };
};

function formatMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG")} ${currency}`;
}

function customerText(order: WholesaleOrder, field: string) {
  const value = order.customerSnapshot?.[field];
  return typeof value === "string" && value.trim() ? value : "-";
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminWholesaleAnalyticsPage() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [products, setProducts] = useState<WholesaleProductSettingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [summaryResponse, ordersResponse, productsResponse] = await Promise.all([
        fetch("/api/admin/wholesale/summary"),
        fetch("/api/admin/wholesale/orders?status=all"),
        fetch("/api/admin/wholesale/product-settings"),
      ]);
      const summaryPayload = await summaryResponse.json().catch(() => null);
      const ordersPayload = await ordersResponse.json().catch(() => null);
      const productsPayload = await productsResponse.json().catch(() => null);

      if (!summaryResponse.ok) {
        throw new Error(summaryPayload?.error || "تعذر تحميل ملخص الجملة");
      }
      if (!ordersResponse.ok) {
        throw new Error(ordersPayload?.error || "تعذر تحميل طلبات الجملة");
      }
      if (!productsResponse.ok) {
        throw new Error(productsPayload?.error || "تعذر تحميل منتجات الجملة");
      }

      setSummary(summaryPayload.summary);
      setOrders(Array.isArray(ordersPayload?.orders) ? ordersPayload.orders : []);
      setProducts(
        Array.isArray(productsPayload?.products) ? productsPayload.products : []
      );
    } catch (loadError) {
      console.error("Wholesale analytics load failed", loadError);
      setError("فشل تحميل تحليلات الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAnalytics(true);
  }, []);

  const analysis = useMemo(() => {
    const customerTotals = new Map<string, { name: string; orders: number; value: number }>();
    const productTotals = new Map<string, { name: string; units: number; value: number }>();
    const categoryTotals = new Map<string, { name: string; units: number; value: number }>();
    const categoryByProductId = new Map(
      products.map((product) => [product.id, product.category])
    );

    for (const order of orders) {
      const customerKey = customerText(order, "businessName") || order.wholesaleCustomerId;
      const customer = customerTotals.get(customerKey) || {
        name: customerKey,
        orders: 0,
        value: 0,
      };
      customer.orders += 1;
      customer.value += order.subtotal;
      customerTotals.set(customerKey, customer);

      for (const item of order.items) {
        const productKey = item.productId;
        const product = productTotals.get(productKey) || {
          name: item.productNameAr || item.productNameEn || productKey,
          units: 0,
          value: 0,
        };
        product.units += item.orderedUnits;
        product.value += item.lineTotal;
        productTotals.set(productKey, product);

        const categoryName = categoryByProductId.get(item.productId) || "غير محدد";
        const category = categoryTotals.get(categoryName) || {
          name: categoryName,
          units: 0,
          value: 0,
        };
        category.units += item.orderedUnits;
        category.value += item.lineTotal;
        categoryTotals.set(categoryName, category);
      }
    }

    return {
      topCustomers: Array.from(customerTotals.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      topProducts: Array.from(productTotals.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      topCategories: Array.from(categoryTotals.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    };
  }, [orders, products]);

  function exportOrdersCsv() {
    const rows = [
      ["order_number", "customer", "status", "subtotal", "items", "created_at"],
      ...orders.map((order) => [
        order.orderNumber,
        customerText(order, "businessName"),
        order.status,
        order.subtotal,
        order.items.length,
        order.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wholesale-analytics-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">تحليلات الجملة</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            قراءة إدارية لأداء طلبات الجملة والعملاء والمنتجات.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportOrdersCsv}
            disabled={!orders.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => loadAnalytics(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="إجمالي الطلبات" value={summary.orders.total.toLocaleString("ar-EG")} />
            <Metric label="قيمة الطلبات" value={formatMoney(summary.orders.revenue)} />
            <Metric label="متوسط الطلب" value={formatMoney(summary.orders.averageOrderValue)} />
            <Metric label="القطع المرتجعة" value={summary.returns.returnedUnits.toLocaleString("ar-EG")} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <RankTable
              title="أعلى عملاء الجملة"
              rows={analysis.topCustomers.map((item) => ({
                name: item.name,
                meta: `${item.orders.toLocaleString("ar-EG")} طلب`,
                value: formatMoney(item.value),
              }))}
            />
            <RankTable
              title="أعلى منتجات الجملة"
              rows={analysis.topProducts.map((item) => ({
                name: item.name,
                meta: `${item.units.toLocaleString("ar-EG")} قطعة`,
                value: formatMoney(item.value),
              }))}
            />
            <RankTable
              title="أقسام حسب قيمة الجملة"
              rows={analysis.topCategories.map((item) => ({
                name: item.name,
                meta: `${item.units.toLocaleString("ar-EG")} قطعة`,
                value: formatMoney(item.value),
              }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function RankTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; meta: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${title}-${row.name}`}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <p className="font-black text-slate-900">{row.name}</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                <span>{row.meta}</span>
                <span>{row.value}</span>
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
