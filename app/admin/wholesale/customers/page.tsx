"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import type {
  WholesaleAdminCustomer,
  WholesaleCustomerStatus,
} from "@/types/wholesale";

const statusLabels: Record<WholesaleCustomerStatus, string> = {
  pending_account: "بانتظار ربط الحساب",
  active: "نشط",
  suspended: "موقوف",
};

const statusClasses: Record<WholesaleCustomerStatus, string> = {
  pending_account: "border-amber-100 bg-amber-50 text-amber-700",
  active: "border-emerald-100 bg-emerald-50 text-emerald-700",
  suspended: "border-rose-100 bg-rose-50 text-rose-700",
};

const statusOptions: Array<WholesaleCustomerStatus | "all"> = [
  "all",
  "pending_account",
  "active",
  "suspended",
];

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `2${digits}`;
  return `20${digits}`;
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminWholesaleCustomersPage() {
  const [customers, setCustomers] = useState<WholesaleAdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    WholesaleCustomerStatus | "all"
  >("all");
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(
    null
  );

  async function loadCustomers(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (query.trim()) params.set("q", query.trim());

      const response = await fetch(
        `/api/admin/wholesale/customers?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل عملاء الجملة");
      }

      setCustomers(Array.isArray(payload?.customers) ? payload.customers : []);
    } catch (loadError) {
      console.error("Wholesale customers load failed", loadError);
      setError("فشل تحميل عملاء الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCustomers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totals = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((customer) => customer.status === "active").length,
      pending: customers.filter(
        (customer) => customer.status === "pending_account"
      ).length,
      suspended: customers.filter((customer) => customer.status === "suspended")
        .length,
    }),
    [customers]
  );

  function exportCsv() {
    const rows = [
      [
        "business_name",
        "contact_name",
        "status",
        "phone",
        "whatsapp",
        "email",
        "governorate",
        "city",
        "auth_user_id",
        "approved_at",
      ],
      ...customers.map((customer) => [
        customer.businessName,
        customer.contactName,
        statusLabels[customer.status],
        customer.phone,
        customer.whatsapp,
        customer.email || "",
        customer.governorate,
        customer.city,
        customer.authUserId || "",
        customer.approvedAt || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wholesale-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteCustomer(customer: WholesaleAdminCustomer) {
    const label = customer.businessName || customer.contactName || customer.id;
    if (
      !window.confirm(
        `هل تريد حذف حساب الجملة "${label}"؟ سيتم حذف صلاحية الجملة فقط ولن يتم حذف حساب تسجيل الدخول العام. لا يمكن حذف عميل لديه طلبات جملة مرتبطة.`
      )
    ) {
      return;
    }

    try {
      setDeletingCustomerId(customer.id);
      const response = await fetch(
        `/api/admin/wholesale/customers/${customer.id}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حذف حساب عميل الجملة");
      }

      setCustomers((current) =>
        current.filter((currentCustomer) => currentCustomer.id !== customer.id)
      );
    } catch (deleteError) {
      console.error("Wholesale customer delete failed", deleteError);
      alert(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذر حذف حساب عميل الجملة"
      );
    } finally {
      setDeletingCustomerId(null);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">عملاء الجملة</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            قائمة مستقلة لحسابات الجملة المعتمدة وحالة ربطها بالمستخدمين.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!customers.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => loadCustomers(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadCustomers(false);
            }}
            placeholder="بحث باسم النشاط أو المسؤول أو الهاتف أو البريد"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as WholesaleCustomerStatus | "all")
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none transition focus:border-blue-400 focus:bg-white"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "كل الحالات" : statusLabels[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => loadCustomers(false)}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
        >
          بحث
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="الإجمالي" value={totals.total} />
        <Metric label="نشط" value={totals.active} />
        <Metric label="بانتظار الربط" value={totals.pending} />
        <Metric label="موقوف" value={totals.suspended} />
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
      ) : !customers.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-black text-slate-900">
            لا يوجد عملاء جملة مطابقون
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="p-3 text-right">النشاط</th>
                <th className="p-3 text-right">المسؤول</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">الموقع</th>
                <th className="p-3 text-right">الربط</th>
                <th className="p-3 text-right">تاريخ الاعتماد</th>
                <th className="p-3 text-right">تواصل</th>
                <th className="p-3 text-right">إدارة</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const whatsapp = normalizeWhatsAppNumber(customer.whatsapp);
                return (
                  <tr key={customer.id} className="border-t border-slate-100">
                    <td className="p-3 font-black text-slate-950">
                      {customer.businessName || "-"}
                      <div className="mt-1 text-xs font-bold text-slate-400">
                        {customer.email || "لا يوجد بريد"}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-700">
                      {customer.contactName || "-"}
                      <div className="mt-1 text-xs text-slate-400">
                        {customer.phone || "-"}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses[customer.status]}`}
                      >
                        {statusLabels[customer.status]}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-600">
                      {customer.governorate || "-"} / {customer.city || "-"}
                    </td>
                    <td className="p-3 text-xs font-bold text-slate-500">
                      {customer.authUserId ? customer.authUserId : "غير مربوط"}
                    </td>
                    <td className="p-3 font-bold text-slate-600">
                      {formatDate(customer.approvedAt)}
                    </td>
                    <td className="p-3">
                      {whatsapp ? (
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:border-emerald-400"
                        >
                          <Phone className="h-4 w-4" />
                          واتساب
                        </a>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          غير متاح
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={deletingCustomerId === customer.id}
                        onClick={() => deleteCustomer(customer)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:border-rose-400 disabled:opacity-60"
                      >
                        {deletingCustomerId === customer.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        حذف حساب الجملة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {value.toLocaleString("ar-EG")}
      </p>
    </div>
  );
}
