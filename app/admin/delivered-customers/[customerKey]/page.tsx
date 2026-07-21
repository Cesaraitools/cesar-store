"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  User,
} from "lucide-react";

type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  email: string;
};

type CustomerOrder = {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  currency: string;
  current_status: string;
  status_at: string;
  delivered_at: string | null;
};

type CustomerDetailsResponse = {
  customer: CustomerInfo | null;
  orders: CustomerOrder[];
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    totalValue: number;
  };
};

const EMPTY_RESPONSE: CustomerDetailsResponse = {
  customer: null,
  orders: [],
  summary: {
    totalOrders: 0,
    deliveredOrders: 0,
    totalValue: 0,
  },
};

const STATUS_LABELS: Record<string, string> = {
  requested: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "جاري التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغي",
};

const STATUS_STYLES: Record<string, string> = {
  delivered: "border-emerald-100 bg-emerald-50 text-emerald-700",
  shipped: "border-blue-100 bg-blue-50 text-blue-700",
  preparing: "border-amber-100 bg-amber-50 text-amber-700",
  confirmed: "border-purple-100 bg-purple-50 text-purple-700",
  requested: "border-slate-100 bg-slate-50 text-slate-700",
  canceled: "border-rose-100 bg-rose-50 text-rose-700",
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

function formatMoney(value: number, currency = "EGP") {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        STATUS_STYLES[status] || "border-slate-100 bg-slate-50 text-slate-700"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">{label}</p>
          <p
            dir={dir}
            className="mt-2 break-words text-sm font-black text-slate-950"
          >
            {value || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const rawCustomerKey = params?.customerKey as string;
  const customerKey = rawCustomerKey ? decodeURIComponent(rawCustomerKey) : "";
  const [data, setData] = useState<CustomerDetailsResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDetails() {
    if (!customerKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/delivered-customers/${encodeURIComponent(customerKey)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("failed");
      }

      const payload = (await response.json()) as CustomerDetailsResponse;
      setData({
        customer: payload.customer || null,
        orders: payload.orders || [],
        summary: payload.summary || EMPTY_RESPONSE.summary,
      });
    } catch (err) {
      console.error("Customer details failed", err);
      setError("تعذر تحميل تفاصيل العميل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerKey]);

  return (
    <div className="space-y-8" dir="rtl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/admin/delivered-customers"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            <ArrowRight className="h-4 w-4" />
            الرجوع إلى بيانات العملاء
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            تفاصيل العميل
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            كل طلبات العميل وحالة كل طلب كما تظهر في شاشة الطلبات.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDetails}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          جاري تحميل تفاصيل العميل...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={User} label="اسم العميل" value={data.customer?.name} />
            <InfoCard
              icon={Phone}
              label="الهاتف"
              value={data.customer?.phone}
              dir="ltr"
            />
            <InfoCard
              icon={Mail}
              label="البريد الإلكتروني"
              value={data.customer?.email}
              dir="ltr"
            />
            <InfoCard
              icon={MapPin}
              label="العنوان"
              value={data.customer?.address}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                إجمالي الطلبات
              </p>
              <p className="mt-3 text-3xl font-black text-slate-950">
                {data.summary.totalOrders}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                طلبات تم تسليمها
              </p>
              <p className="mt-3 text-3xl font-black text-emerald-700">
                {data.summary.deliveredOrders}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                إجمالي قيمة الطلبات
              </p>
              <p className="mt-3 text-3xl font-black text-slate-950">
                {formatMoney(data.summary.totalValue)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">طلبات العميل</h2>
              <Package className="h-5 w-5 text-slate-400" />
            </div>

            {data.orders.length === 0 ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                لا توجد طلبات لهذا العميل.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-right">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        رقم الطلب
                      </th>
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        الحالة
                      </th>
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        الإجمالي
                      </th>
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        تاريخ الطلب
                      </th>
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        آخر تحديث للحالة
                      </th>
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        إدارة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-950">
                          {order.order_number}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusBadge status={order.current_status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-950">
                          {formatMoney(order.total, order.currency)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatDate(order.status_at)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            فتح الطلب
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
