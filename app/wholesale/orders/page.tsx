"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { formatVariantSnapshot } from "@/lib/product-variants";
import type { WholesaleOrder, WholesaleOrderStatus } from "@/types/wholesale";

const statusContent: Record<
  WholesaleOrderStatus,
  {
    label: string;
    title: string;
    description: string;
    className: string;
    icon: typeof Clock3;
  }
> = {
  requested: {
    label: "تم الاستلام",
    title: "تم استلام طلب الجملة",
    description: "فريق سيزر سيبدأ مراجعة الطلب والتأكد من الكميات المتاحة.",
    className: "border-slate-100 bg-slate-50 text-slate-800",
    icon: Clock3,
  },
  confirmed: {
    label: "تم التأكيد",
    title: "تم تأكيد طلب الجملة",
    description: "تم قبول الطلب من سيزر وخصم الكميات المطلوبة من المخزون.",
    className: "border-purple-100 bg-purple-50 text-purple-800",
    icon: ShieldAlert,
  },
  preparing: {
    label: "جاري التحضير",
    title: "طلبك جاري التحضير",
    description: "فريق سيزر يقوم بتجهيز الأصناف والكميات المطلوبة.",
    className: "border-amber-100 bg-amber-50 text-amber-800",
    icon: PackageCheck,
  },
  shipped: {
    label: "تم الشحن",
    title: "تم شحن طلب الجملة",
    description: "تم خروج الطلب للتسليم حسب بيانات التواصل والعنوان المسجل.",
    className: "border-blue-100 bg-blue-50 text-blue-800",
    icon: PackageCheck,
  },
  delivered: {
    label: "تم التسليم",
    title: "تم تسليم طلب الجملة",
    description: "تم تسليم الطلب وإنهاء عملية البيع بالجملة.",
    className: "border-emerald-100 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  canceled: {
    label: "ملغي",
    title: "تم إلغاء طلب الجملة",
    description: "تم إلغاء هذا الطلب، وتم إرجاع الكميات للمخزون إذا كان الطلب مؤكدا.",
    className: "border-rose-100 bg-rose-50 text-rose-800",
    icon: XCircle,
  },
};

type OrdersResponse = {
  orders?: WholesaleOrder[];
  error?: string;
};

function formatMoney(value: number, currency = "EGP") {
  return `${new Intl.NumberFormat("ar-EG").format(Number(value || 0))} ${currency}`;
}

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

function orderDisplayNumber(order: WholesaleOrder) {
  return order.orderNumber || order.id;
}

export default function WholesaleOrdersPage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadOrders = useCallback(async (initial = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/wholesale/orders", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | OrdersResponse
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل طلبات الجملة");
      }

      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
      setLastUpdatedAt(new Date().toISOString());
    } catch (ordersError) {
      setError(
        ordersError instanceof Error
          ? ordersError.message
          : "تعذر تحميل طلبات الجملة"
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      loadOrders(false);
    }, 5000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        loadOrders(false);
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [loadOrders]);

  const totals = useMemo(
    () => ({
      count: orders.length,
      value: orders.reduce((total, order) => total + order.subtotal, 0),
    }),
    [orders]
  );

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/wholesale"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لقسم الجملة
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
                <PackageCheck className="h-4 w-4 text-orange-600" />
                طلبات الجملة
              </div>
              <h1 className="mt-5 text-3xl font-black md:text-5xl">
                متابعة طلبات الجملة
              </h1>
              <p className="mt-3 max-w-2xl leading-8 text-slate-600">
                تابع حالة طلبات الجملة التي تم إرسالها من حسابك. يتم تحديث الحالة تلقائيا عند تغييرها من إدارة سيزر.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadOrders(false)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Info label="عدد الطلبات" value={totals.count.toLocaleString("ar-EG")} />
            <Info label="إجمالي الطلبات" value={formatMoney(totals.value)} />
            <Info
              label="آخر تحديث"
              value={lastUpdatedAt ? formatDate(lastUpdatedAt) : "-"}
            />
          </div>
        </section>

        {loading ? (
          <div className="mt-6 flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-9 w-9 animate-spin text-orange-600" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-700">
            <ShieldAlert className="h-9 w-9" />
            <h2 className="mt-4 text-2xl font-black">تعذر تحميل الطلبات</h2>
            <p className="mt-3 leading-7">{error}</p>
            <Link
              href="/auth/login?redirect=/wholesale/orders"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <PackageCheck className="h-14 w-14 text-slate-300" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              لا توجد طلبات جملة حتى الآن
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              أضف منتجات من كتالوج الجملة ثم أرسل طلبك الأول.
            </p>
            <Link
              href="/wholesale/catalog"
              className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
            >
              فتح كتالوج الجملة
            </Link>
          </div>
        ) : (
          <section className="mt-6 space-y-4">
            {orders.map((order) => {
              const status = statusContent[order.status];
              const StatusIcon = status.icon;

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-950" dir="ltr">
                          {orderDisplayNumber(order)}
                        </h2>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
                        >
                          <StatusIcon className="h-4 w-4" />
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-500">
                        تاريخ الطلب: {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800">
                      <p className="text-xs font-black text-emerald-600">الإجمالي</p>
                      <p className="mt-1 text-2xl font-black">
                        {formatMoney(order.subtotal, order.currency)}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-5 rounded-2xl border p-4 ${status.className}`}>
                    <div className="flex items-start gap-3">
                      <StatusIcon className="mt-1 h-6 w-6 shrink-0" />
                      <div>
                        <h3 className="text-lg font-black">{status.title}</h3>
                        <p className="mt-2 text-sm font-bold leading-7">
                          {status.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {order.notes ? (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      {order.notes}
                    </div>
                  ) : null}

                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-slate-50 text-xs font-black text-slate-500">
                        <tr>
                          <th className="p-3 text-right">الصنف</th>
                          <th className="p-3 text-right">أقل كمية</th>
                          <th className="p-3 text-right">الكمية المطلوبة</th>
                          <th className="p-3 text-right">سعر القطعة</th>
                          <th className="p-3 text-right">الإجمالي</th>
                          <th className="p-3 text-right">المردود</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="p-3 font-black text-slate-900">
                              {item.productNameAr || item.productNameEn}
                              {formatVariantSnapshot(item.variant, "ar") ? (
                                <div className="mt-1 text-xs font-black text-orange-700">
                                  {formatVariantSnapshot(item.variant, "ar")}
                                </div>
                              ) : null}
                            </td>
                            <td className="p-3 font-bold text-slate-600">
                              {item.minOrderUnits.toLocaleString("ar-EG")} قطعة
                            </td>
                            <td className="p-3 font-bold text-slate-600">
                              {item.orderedUnits.toLocaleString("ar-EG")} قطعة
                            </td>
                            <td className="p-3 font-bold text-slate-600">
                              {formatMoney(item.unitPrice, order.currency)}
                            </td>
                            <td className="p-3 font-black text-slate-900">
                              {formatMoney(item.lineTotal, order.currency)}
                            </td>
                            <td className="p-3 font-bold text-rose-600">
                              {(item.returnedUnits || 0).toLocaleString("ar-EG")} قطعة
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}
