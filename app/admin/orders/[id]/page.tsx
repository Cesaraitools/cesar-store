"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  subscribeToOrderTrackingEvents,
  unsubscribeFromChannel,
} from "@/lib/supabaseClient";
import { formatVariantSnapshot } from "@/lib/product-variants";
import {
  formatOrderMoney,
  shippingStatusLabel,
  type ShippingStatus,
} from "@/lib/order-pricing";
import {
  ChevronRight,
  Printer,
  User,
  History,
  BadgePercent,
  Save,
} from "lucide-react";

/* ---------------- Types ---------------- */
type TrackingEvent = {
  status: string;
  created_at: string;
  actor?: string;
};

type OrderStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

type OrderDetails = {
  id: string;
  subtotal: number;
  shipping_fee: number;
  shipping_status: ShippingStatus;
  discount: number;
  discount_reason?: string;
  total: number;
  pricing_version: number;
  pricing_updated_at?: string | null;
  pricing_updated_by?: string | null;
  currency: string;
  created_at: string;
  status?: string;
  customer_snapshot?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items?: {
    name: string;
    price: number;
    quantity: number;
    variant?: any;
  }[];
  tracking?: TrackingEvent[];
  pricing_history?: Array<{
    admin_email?: string | null;
    created_at?: string | null;
    payload?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    } | null;
  }>;
};

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [status, setStatus] = useState<OrderStatus>("requested");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("pending");
  const [shippingFee, setShippingFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [discountReason, setDiscountReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  /* ================= Fetch ================= */
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) throw new Error("تعذر تحميل الطلب");

      const data = await res.json();
      const orderData = data.order;

      setOrder(orderData);
      setTracking(orderData.tracking || []);
      setStatus(orderData.status as OrderStatus);
      setShippingStatus(orderData.shipping_status || "pending");
      setShippingFee(String(Number(orderData.shipping_fee || 0)));
      setDiscount(String(Number(orderData.discount || 0)));
      setDiscountReason(orderData.discount_reason || "");

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("حدث خطأ في استلام البيانات من الخادم");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    loadInitialData();

    channelRef.current = subscribeToOrderTrackingEvents(id, () => {
      // 🔥 تحديث كامل لضمان التزامن
      loadInitialData();
    });

    return () => {
      if (channelRef.current) unsubscribeFromChannel(channelRef.current);
    };
  }, [id, loadInitialData]);

  /* ================= Actions ================= */
  async function runAction(nextStatus: OrderStatus) {
    if (!order || actionLoading) return;

    if (!window.confirm("هل أنت متأكد من تغيير حالة الطلب؟")) return;

    try {
      setActionLoading(true);

      const res = await fetch("/api/admin/order-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          event: nextStatus,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || "فشل تحديث الحالة");

      // ✅ إعادة تحميل البيانات بعد التحديث
      await loadInitialData();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function savePricing() {
    if (!order || pricingLoading) return;

    const parsedShipping = shippingStatus === "set" ? Number(shippingFee) : 0;
    const parsedDiscount = Number(discount);

    if (!Number.isFinite(parsedShipping) || !Number.isFinite(parsedDiscount)) {
      setPricingMessage("أدخل أرقامًا صحيحة للشحن والخصم");
      return;
    }

    try {
      setPricingLoading(true);
      setPricingMessage(null);

      const response = await fetch(`/api/admin/orders/${order.id}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingStatus,
          shippingFee: parsedShipping,
          discount: parsedDiscount,
          discountReason,
          expectedVersion: order.pricing_version,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "تعذر حفظ التسوية المالية");
      }

      await loadInitialData();
      setPricingMessage("تم حفظ الشحن والخصم وتحديث إجمالي الطلب");
    } catch (err: any) {
      setPricingMessage(err?.message || "تعذر حفظ التسوية المالية");
    } finally {
      setPricingLoading(false);
    }
  }

  /* ================= UI ================= */

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-blue-600 animate-pulse">
        جاري تحميل البيانات...
      </div>
    );

  if (error || !order)
    return (
      <div className="p-20 text-center text-red-500 font-bold">
        ⚠️ {error}
      </div>
    );

  const pricingLocked = ["shipped", "delivered", "canceled"].includes(status);
  const previewShipping = shippingStatus === "set" ? Number(shippingFee || 0) : 0;
  const previewDiscount = Number(discount || 0);
  const previewTotal = Math.max(
    0,
    Number(order.subtotal || 0) +
      (Number.isFinite(previewShipping) ? previewShipping : 0) -
      (Number.isFinite(previewDiscount) ? previewDiscount : 0)
  );

  return (
    <div
      className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
          <Link
            href="/admin/orders"
            className="text-blue-600 flex items-center gap-1 text-sm font-bold hover:underline"
          >
            <ChevronRight size={16} /> العودة للطلبات
          </Link>

          <a
            href={`/api/admin/orders/${order.id}/report`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Printer size={16} />
            {"\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 / PDF"}
          </a>

          <h1 className="text-2xl font-black text-slate-900">
            طلب #{order.id.slice(0, 8)}
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Status Card */}
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                الحالة الحالية
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4">

                <div className={`text-3xl font-black px-6 py-3 rounded-2xl ${
                  status === "canceled"
                    ? "text-red-600 bg-red-50"
                    : "text-blue-600 bg-blue-50"
                }`}>
                  {status}
                </div>

                <div className="flex flex-wrap gap-2">

                  {status === "requested" && (
                    <>
                      <button
                        onClick={() => runAction("confirmed")}
                        disabled={actionLoading}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black"
                      >
                        تأكيد
                      </button>

                      <button
                        onClick={() => runAction("canceled")}
                        disabled={actionLoading}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700"
                      >
                        إلغاء الطلب
                      </button>
                    </>
                  )}

                  {status === "confirmed" && (
                    <>
                      <button
                        onClick={() => runAction("preparing")}
                        disabled={actionLoading}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700"
                      >
                        تجهيز
                      </button>

                      <button
                        onClick={() => runAction("canceled")}
                        disabled={actionLoading}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700"
                      >
                        إلغاء الطلب
                      </button>
                    </>
                  )}

                  {status === "preparing" && (
                    <div className="text-left">
                      <button
                        onClick={() => runAction("shipped")}
                        disabled={actionLoading || order.shipping_status === "pending"}
                        title={
                          order.shipping_status === "pending"
                            ? "حدد تكلفة الشحن أو اختر الإعفاء أولًا"
                            : undefined
                        }
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        شحن
                      </button>
                      {order.shipping_status === "pending" && (
                        <p className="mt-2 max-w-52 text-xs font-bold text-amber-600">
                          يجب اعتماد قرار الشحن قبل نقل الطلب للشحن.
                        </p>
                      )}
                    </div>
                  )}

                  {status === "shipped" && (
                    <button
                      onClick={() => runAction("delivered")}
                      disabled={actionLoading}
                      className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700"
                    >
                      تسليم
                    </button>
                  )}

                </div>
              </div>
            </div>

            {/* Financial adjustment */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-black text-slate-800">
                  <BadgePercent size={20} className="text-blue-600" />
                  التسوية المالية
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    order.shipping_status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {shippingStatusLabel(order.shipping_status)}
                </span>
              </div>

              {pricingLocked && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                  تم قفل التسوية لأن الطلب أصبح مشحونًا أو مغلقًا. تظل القيم ظاهرة للرجوع إليها.
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black text-slate-500">قرار الشحن</span>
                  <select
                    value={shippingStatus}
                    disabled={pricingLocked || pricingLoading}
                    onChange={(event) => {
                      const next = event.target.value as ShippingStatus;
                      setShippingStatus(next);
                      if (next !== "set") setShippingFee("0");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 disabled:bg-slate-100"
                  >
                    <option value="pending">لم يتم تحديد الشحن بعد</option>
                    <option value="set">تم تحديد تكلفة الشحن</option>
                    <option value="waived">إعفاء من الشحن</option>
                    {order.shipping_status === "legacy" && (
                      <option value="legacy">طلب تاريخي</option>
                    )}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black text-slate-500">قيمة الشحن</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={shippingFee}
                    disabled={pricingLocked || pricingLoading || shippingStatus !== "set"}
                    onChange={(event) => setShippingFee(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-bold disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black text-slate-500">خصم على الطلب</span>
                  <input
                    type="number"
                    min="0"
                    max={order.subtotal}
                    step="0.01"
                    inputMode="decimal"
                    value={discount}
                    disabled={pricingLocked || pricingLoading}
                    onChange={(event) => setDiscount(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-bold disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black text-slate-500">
                    سبب الخصم {Number(discount || 0) > 0 ? "(مطلوب)" : "(اختياري)"}
                  </span>
                  <input
                    type="text"
                    maxLength={500}
                    value={discountReason}
                    disabled={pricingLocked || pricingLoading}
                    onChange={(event) => setDiscountReason(event.target.value)}
                    placeholder="مثال: خصم متفق عليه مع العميل"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold disabled:bg-slate-100"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400">المنتجات</p>
                  <p className="font-black">{formatOrderMoney(order.subtotal, order.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">الشحن</p>
                  <p className="font-black">{formatOrderMoney(previewShipping, order.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">الخصم</p>
                  <p className="font-black text-rose-600">-{formatOrderMoney(previewDiscount, order.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">الإجمالي بعد الحفظ</p>
                  <p className="font-black text-blue-700">{formatOrderMoney(previewTotal, order.currency)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {pricingMessage && (
                    <p className={`text-sm font-bold ${pricingMessage.startsWith("تم ") ? "text-emerald-600" : "text-rose-600"}`}>
                      {pricingMessage}
                    </p>
                  )}
                  {order.pricing_updated_at && (
                    <p className="mt-1 text-xs text-slate-400">
                      آخر تعديل: {new Date(order.pricing_updated_at).toLocaleString("ar-EG")}
                      {order.pricing_updated_by ? ` بواسطة ${order.pricing_updated_by}` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={savePricing}
                  disabled={pricingLocked || pricingLoading || shippingStatus === "legacy"}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save size={17} />
                  {pricingLoading ? "جاري الحفظ..." : "حفظ التسوية المالية"}
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800">
                <User size={20} className="text-blue-600" /> معلومات العميل
              </div>

              <div className="grid md:grid-cols-2 gap-6">

                <div>
                  <p className="text-xs text-slate-400 mb-1">الاسم</p>
                  <p className="font-bold text-slate-900">
                    {order.customer_snapshot?.name || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">الهاتف</p>
                  <p className="font-bold text-slate-700" dir="ltr">
                    {order.customer_snapshot?.phone || "—"}
                  </p>
                </div>

              </div>
            </div>
          </div>

                {/* Timeline */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit">
            <h2 className="font-black text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
              <History size={18} className="text-blue-500" />
              السجل المباشر
            </h2>

            <div className="space-y-6 relative">

              <div className="absolute right-3.5 top-0 bottom-0 w-px bg-slate-100"></div>

              {tracking.map((e, i) => (
                <div key={i} className="relative z-10 flex gap-4">

                  <div
                    className={`w-7 h-7 rounded-full border-4 border-white shadow-sm flex-shrink-0 ${
                      e.status === "canceled"
                        ? "bg-red-500"
                        : i === tracking.length - 1
                        ? "bg-blue-600"
                        : "bg-slate-200"
                    }`}
                  ></div>

                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      {e.status}
                    </p>

                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(e.created_at).toLocaleString("ar-EG")}
                    </p>
                  </div>

                </div>
              ))}

            </div>

            {order.pricing_history && order.pricing_history.length > 0 && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="mb-4 text-xs font-black text-slate-500">سجل التسويات المالية</p>
                <div className="space-y-3">
                  {order.pricing_history.map((entry, index) => {
                    const after = entry.payload?.after || {};
                    return (
                      <div key={`${entry.created_at || "pricing"}-${index}`} className="rounded-xl bg-slate-50 p-3 text-xs">
                        <p className="font-bold text-slate-700">
                          الإجمالي: {formatOrderMoney(Number(after.total || 0), order.currency)}
                        </p>
                        <p className="mt-1 text-slate-400">
                          {entry.created_at ? new Date(entry.created_at).toLocaleString("ar-EG") : "—"}
                          {entry.admin_email ? ` · ${entry.admin_email}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

            {/* Order Items */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800">
                 تفاصيل الطلب
              </div>

              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.name}
                        </p>
                        {formatVariantSnapshot(item.variant, "ar") && (
                          <p className="text-xs text-slate-400">
                            {formatVariantSnapshot(item.variant, "ar")}
                          </p>
                        )}
                        <p className="text-xs text-slate-400">
                          الكمية: {item.quantity}
                        </p>
                      </div>

                      <div className="text-left">
                       <p className="font-bold text-slate-900">
                         {item.price} {order.currency}
                       </p>
                       <p className="text-xs text-slate-400">
                         الإجمالي: {item.price * item.quantity}
                       </p>
                     </div>
                   </div>
                 ))
              ) : (
                <div className="text-center py-6 text-slate-400">
                  لا توجد عناصر
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3 border-t pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>مجموع المنتجات</span>
                <span>{formatOrderMoney(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الشحن</span>
                <span>
                  {order.shipping_status === "pending"
                    ? "جاري تحديده"
                    : order.shipping_status === "waived"
                    ? "مجاني"
                    : order.shipping_status === "legacy"
                    ? "غير مسجل تاريخيًا"
                    : formatOrderMoney(order.shipping_fee, order.currency)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم</span>
                  <span>-{formatOrderMoney(order.discount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 text-lg font-black text-slate-900">
                <span>{order.shipping_status === "pending" ? "الإجمالي الحالي" : "الإجمالي النهائي"}</span>
                <span>{formatOrderMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
