"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  PackageCheck,
  Printer,
  RefreshCw,
  WalletCards,
} from "lucide-react";

type ReportRow = {
  order_id: string;
  order_number: string;
  customer_name: string;
  delivered_at: string;
  amount_received: number;
  currency: string;
};

type CurrencyTotal = {
  currency: string;
  amount: number;
};

type ReportResponse = {
  rows: ReportRow[];
  summary: {
    from: string;
    to: string;
    order_count: number;
    totals_by_currency: CurrencyTotal[];
  };
};

const EMPTY_REPORT: ReportResponse = {
  rows: [],
  summary: {
    from: "",
    to: "",
    order_count: 0,
    totals_by_currency: [],
  },
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ar-EG", {
      maximumFractionDigits: 2,
    })} ${currency}`;
  }
}

function formatPeriodDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

export default function ReceivedOrdersReportPage() {
  const [report, setReport] = useState<ReportResponse>(EMPTY_REPORT);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  async function loadReport(from: string, to: string) {
    if (!from || !to) {
      setError("يرجى تحديد تاريخ البداية والنهاية");
      return;
    }

    if (from > to) {
      setError("تاريخ البداية يجب ألا يكون بعد تاريخ النهاية");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ from, to });
      const response = await fetch(
        `/api/admin/orders/received-report?${params.toString()}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل التقرير");
      }

      setReport({
        rows: Array.isArray(payload?.rows) ? payload.rows : [],
        summary: payload?.summary || EMPTY_REPORT.summary,
      });
      setGeneratedAt(new Date().toISOString());
    } catch (reportError) {
      console.error("Received orders report load failed", reportError);
      setReport(EMPTY_REPORT);
      setError(
        reportError instanceof Error
          ? reportError.message
          : "تعذر تحميل تقرير الطلبات المستلمة"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const now = new Date();
    const today = dateInputValue(now);
    const monthStart = `${today.slice(0, 8)}01`;
    setFromDate(monthStart);
    setToDate(today);
    void loadReport(monthStart, today);
    // The initial range is intentionally calculated once in the browser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="received-orders-report space-y-7 text-right" dir="rtl">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          .admin-sidebar,
          .admin-topbar,
          .report-screen-controls {
            display: none !important;
          }

          .admin-main {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
          }

          .received-orders-report {
            color: #0f172a !important;
          }

          .received-orders-report table {
            font-size: 11px !important;
          }

          .received-orders-report tr {
            break-inside: avoid;
          }
        }
      `}</style>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="report-screen-controls mb-3">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى الطلبات
            </Link>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            تقرير الطلبات المستلمة
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            المبالغ النهائية للطلبات التي وصلت فعليًا إلى حالة تم التسليم.
          </p>
          {report.summary.from && report.summary.to ? (
            <p className="mt-2 text-xs font-bold text-slate-600">
              الفترة: من {formatPeriodDate(report.summary.from)} إلى{" "}
              {formatPeriodDate(report.summary.to)}
            </p>
          ) : null}
        </div>

        <div className="report-screen-controls flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadReport(fromDate, toDate)}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || !report.rows.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            طباعة التقرير
          </button>
        </div>
      </header>

      <section className="report-screen-controls rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-2">
            <span className="block text-xs font-black text-slate-600">
              من تاريخ الاستلام
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
            />
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-black text-slate-600">
              إلى تاريخ الاستلام
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
            />
          </label>
          <button
            type="button"
            onClick={() => loadReport(fromDate, toDate)}
            disabled={loading || !fromDate || !toDate}
            className="h-12 rounded-xl bg-blue-600 px-7 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            عرض الفترة
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-500">
                عدد الطلبات المستلمة
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {report.summary.order_count.toLocaleString("ar-EG")}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <PackageCheck className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-500">
                إجمالي الفترة المختارة
              </p>
              <div className="mt-2 space-y-1">
                {report.summary.totals_by_currency.length ? (
                  report.summary.totals_by_currency.map((total) => (
                    <p
                      key={total.currency}
                      className="text-2xl font-black text-emerald-700"
                    >
                      {formatMoney(total.amount, total.currency)}
                    </p>
                  ))
                ) : (
                  <p className="text-2xl font-black text-slate-400">0 ج.م</p>
                )}
              </div>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <WalletCards className="h-6 w-6" />
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">بيان التحصيل</h2>
          {generatedAt ? (
            <span className="text-[11px] font-bold text-slate-400">
              تاريخ إعداد التقرير: {formatDate(generatedAt)}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm font-bold text-blue-700">
            جاري إعداد التقرير...
          </div>
        ) : report.rows.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              لا توجد طلبات مستلمة خلال الفترة المختارة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-16 px-5 py-3 text-xs font-black text-slate-600">
                    م
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-600">
                    رقم الطلب
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-600">
                    اسم العميل
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-600">
                    تاريخ الاستلام
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-600">
                    مبلغ الطلب المستلم
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {report.rows.map((row, index) => (
                  <tr key={row.order_id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-black text-slate-500">
                      {(index + 1).toLocaleString("ar-EG")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-blue-700">
                      {row.order_number}
                    </td>
                    <td className="min-w-[190px] px-5 py-4 text-sm font-black text-slate-950">
                      {row.customer_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                      {formatDate(row.delivered_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-emerald-700">
                      {formatMoney(row.amount_received, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-4 text-left text-sm font-black text-slate-950"
                  >
                    إجمالي الفترة المختارة
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {report.summary.totals_by_currency.map((total) => (
                        <p
                          key={total.currency}
                          className="whitespace-nowrap text-sm font-black text-emerald-700"
                        >
                          {formatMoney(total.amount, total.currency)}
                        </p>
                      ))}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
