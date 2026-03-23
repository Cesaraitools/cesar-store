"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  subscribeToOrderTrackingEvents,
  unsubscribeFromChannel,
} from "@/lib/supabaseClient";
import {
  ChevronRight,
  Printer,
  User,
  Phone,
  Mail,
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
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
  total: number;
  currency: string;
  created_at: string;
  status?: string;
  customer_snapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items?: {
    name: string;
    price: number;
    quantity: number;
  }[];
  tracking?: TrackingEvent[];
};

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [status, setStatus] = useState<OrderStatus>("requested");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  /* ================= Fetch ================= */
  async function loadInitialData() {
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

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("حدث خطأ في استلام البيانات من الخادم");
    } finally {
      setLoading(false);
    }
  }

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
  }, [id]);

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

      if (!res.ok) throw new Error("فشل تحديث الحالة");

      // ✅ إعادة تحميل البيانات بعد التحديث
      await loadInitialData();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
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

  return (
    <div
      className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link
            href="/admin/orders"
            className="text-blue-600 flex items-center gap-1 text-sm font-bold hover:underline"
          >
            <ChevronRight size={16} /> العودة للطلبات
          </Link>

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
                    <button
                      onClick={() => runAction("shipped")}
                      disabled={actionLoading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700"
                    >
                      شحن
                    </button>
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

            <div className="mt-6 border-t pt-4 flex justify-between font-black text-slate-900">
              <span>إجمالي الطلب</span>
              <span>
                {order.total} {order.currency}
              </span>
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
          </div>

        </div>
      </div>
    </div>
  );
}