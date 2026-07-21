"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

type DeliveredCustomer = {
  customer_key: string;
  order_id: string;
  order_number: string;
  order_created_at: string;
  delivered_at: string | null;
  name: string;
  phone: string;
  address: string;
  email: string;
  order_count: number;
  delivered_order_numbers: string[];
};

type DeliveredCustomersResponse = {
  customers: DeliveredCustomer[];
  summary: {
    deliveredOrders: number;
    uniqueCustomers: number;
    uniquePhones: number;
    withEmail: number;
  };
};

const EMPTY_RESPONSE: DeliveredCustomersResponse = {
  customers: [],
  summary: {
    deliveredOrders: 0,
    uniqueCustomers: 0,
    uniquePhones: 0,
    withEmail: 0,
  },
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

async function exportToExcel(rows: DeliveredCustomer[]) {
  if (!rows.length) return;

  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      "اسم العميل": row.name,
      "رقم الهاتف": row.phone,
      "العنوان": row.address,
      "البريد الإلكتروني": row.email,
      "عدد الطلبات المستلمة": row.order_count,
      "آخر رقم طلب مستلم": row.order_number,
      "أرقام الطلبات المستلمة": row.delivered_order_numbers.join(", "),
      "آخر تاريخ تسليم": formatDate(row.delivered_at),
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Delivered Customers");
  XLSX.writeFile(
    workbook,
    `delivered-customers-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function DeliveredCustomersReportPage() {
  const [data, setData] = useState<DeliveredCustomersResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  async function loadReport() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const response = await fetch(
        `/api/admin/delivered-customers?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("failed");
      }

      const payload = (await response.json()) as DeliveredCustomersResponse;
      setData({
        customers: payload.customers || [],
        summary: payload.summary || EMPTY_RESPONSE.summary,
      });
    } catch (err) {
      console.error("Delivered customers report failed", err);
      setError("تعذر تحميل تقرير العملاء المستلمين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = normalizeSearch(search);

    if (!query) return data.customers;

    return data.customers.filter((customer) =>
      [
        customer.order_number,
        customer.name,
        customer.phone,
        customer.address,
        customer.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data.customers, search]);

  async function handleExport() {
    try {
      setExporting(true);
      await exportToExcel(filteredCustomers);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            تقرير العملاء المستلمين
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            قائمة العملاء الذين وصلت طلباتهم فعليًا إلى حالة تم التسليم.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredCustomers.length || exporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? "جاري التصدير..." : "تصدير Excel"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="طلبات تم تسليمها"
          value={data.summary.deliveredOrders}
          icon={Users}
        />
        <StatCard
          label="عملاء بدون تكرار"
          value={data.summary.uniqueCustomers}
          icon={Users}
        />
        <StatCard
          label="أرقام عملاء فريدة"
          value={data.summary.uniquePhones}
          icon={Phone}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو العنوان أو البريد"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
          />
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="h-12 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            تطبيق
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            العملاء المستلمون
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {filteredCustomers.length} نتيجة
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">
            جاري تحميل التقرير...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm font-bold text-rose-600">
            {error}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">
            لا توجد طلبات مستلمة ضمن الفلاتر الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    العميل
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    الهاتف
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    العنوان
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    البريد
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    الطلبات المستلمة
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    آخر تسليم
                  </th>
                  <th className="px-5 py-3 text-xs font-black text-slate-500">
                    التفاصيل
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.customer_key} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="text-sm font-black text-slate-950">
                        {customer.name || "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-800">
                      <span dir="ltr">{customer.phone || "-"}</span>
                    </td>
                    <td className="min-w-[260px] px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                      <span className="inline-flex items-start gap-2">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                        {customer.address || "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                      <span dir="ltr">{customer.email || "-"}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-950">
                      {customer.order_count}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                      {formatDate(customer.delivered_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/admin/delivered-customers/${encodeURIComponent(
                          customer.customer_key
                        )}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" />
                        تفاصيل العميل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
