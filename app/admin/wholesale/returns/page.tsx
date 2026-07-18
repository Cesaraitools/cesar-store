"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { formatVariantSnapshot } from "@/lib/product-variants";
import type { WholesaleAdminReturn } from "@/types/wholesale";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function customerText(itemReturn: WholesaleAdminReturn, field: string) {
  const value = itemReturn.customerSnapshot?.[field];
  return typeof value === "string" && value.trim() ? value : "-";
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminWholesaleReturnsPage() {
  const [returns, setReturns] = useState<WholesaleAdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadReturns(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const response = await fetch(
        `/api/admin/wholesale/returns?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل مردودات الجملة");
      }

      setReturns(Array.isArray(payload?.returns) ? payload.returns : []);
    } catch (loadError) {
      console.error("Wholesale returns load failed", loadError);
      setError("فشل تحميل مردودات الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReturns(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => ({
      records: returns.length,
      units: returns.reduce(
        (total, itemReturn) => total + itemReturn.returnedUnits,
        0
      ),
      value: returns.reduce(
        (total, itemReturn) =>
          total + itemReturn.returnedUnits * itemReturn.unitPrice,
        0
      ),
    }),
    [returns]
  );

  function exportCsv() {
    const rows = [
      [
        "return_number",
        "order_number",
        "business_name",
        "contact_name",
        "product",
        "returned_units",
        "unit_price",
        "reason",
        "created_at",
      ],
      ...returns.map((itemReturn) => [
        itemReturn.returnNumber,
        itemReturn.orderNumber,
        customerText(itemReturn, "businessName"),
        customerText(itemReturn, "contactName"),
        itemReturn.productNameAr || itemReturn.productNameEn,
        itemReturn.returnedUnits,
        itemReturn.unitPrice,
        itemReturn.reason,
        itemReturn.createdAt,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wholesale-returns.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">مردودات الجملة</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            متابعة المردودات المسجلة على طلبات الجملة بعد التسليم.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!returns.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => loadReturns(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_170px_170px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadReturns(false);
            }}
            placeholder="بحث برقم المردود أو الطلب أو العميل أو المنتج"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
        />
        <button
          type="button"
          onClick={() => loadReturns(false)}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
        >
          بحث
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="عدد المردودات" value={totals.records.toLocaleString("ar-EG")} />
        <Metric label="القطع المرتجعة" value={totals.units.toLocaleString("ar-EG")} />
        <Metric
          label="قيمة تقديرية"
          value={`${totals.value.toLocaleString("ar-EG")} EGP`}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : !returns.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-black text-slate-900">
            لا توجد مردودات جملة مطابقة
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="p-3 text-right">المردود</th>
                <th className="p-3 text-right">الطلب</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الصنف</th>
                <th className="p-3 text-right">الكمية</th>
                <th className="p-3 text-right">السبب</th>
                <th className="p-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((itemReturn) => (
                <tr key={itemReturn.id} className="border-t border-slate-100">
                  <td className="p-3 font-black text-slate-950">
                    {itemReturn.returnNumber || itemReturn.id.slice(0, 8)}
                  </td>
                  <td className="p-3 font-bold text-blue-700">
                    {itemReturn.orderNumber}
                  </td>
                  <td className="p-3 font-bold text-slate-700">
                    {customerText(itemReturn, "businessName")}
                    <div className="mt-1 text-xs text-slate-400">
                      {customerText(itemReturn, "contactName")}
                    </div>
                  </td>
                  <td className="p-3 font-black text-slate-900">
                    {itemReturn.productNameAr || itemReturn.productNameEn}
                    {formatVariantSnapshot(itemReturn.variant, "ar") ? (
                      <div className="mt-1 text-xs font-black text-orange-700">
                        {formatVariantSnapshot(itemReturn.variant, "ar")}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 font-black text-rose-700">
                    {itemReturn.returnedUnits.toLocaleString("ar-EG")} قطعة
                  </td>
                  <td className="p-3 font-bold text-slate-600">
                    {itemReturn.reason || "-"}
                    {itemReturn.note ? (
                      <div className="mt-1 text-xs text-slate-400">
                        {itemReturn.note}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 font-bold text-slate-600">
                    {formatDate(itemReturn.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
