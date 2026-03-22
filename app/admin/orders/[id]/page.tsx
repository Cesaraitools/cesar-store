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
  User,
  History,
  Package,
  ShoppingCart,
  Receipt,
  Info
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

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

type OrderDetails = {
  id: string;
  order_number?: string;
  total: number;
  subtotal?: number;
  shipping_fee?: number;
  currency: string;
  created_at: string;
  status?: string;
  customer_snapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  // البيانات التي يتم جلبها من الـ API
  items?: OrderItem[];
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

  useEffect(() => {
    if (!id) return;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        // جلب بيانات الطلب التفصيلية (بما في ذلك المنتجات)
        // ملاحظة: نستخدم المسار العام للطلب للحصول على الـ items كما في صفحة العميل
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error("تعذر الوصول لبيانات الطلب التفصيلية");

        const data = await res.json();
        const found = data.order;

        if (!found) {
          setError("الطلب غير موجود في النظام");
          return;
        }

        setOrder({
          ...found,
          id: found.order_id // توحيد المعرف مع هيكلة الأدمن
        });

        // جلب سجل التتبع
        const trackingRes = await fetch(
          `/api/admin/order-tracking-events?orderId=${id}`
        );

        if (trackingRes.ok) {
          const trackingData = await trackingRes.json();
          const events = trackingData.events || [];

          setTracking(events);

          if (events.length > 0) {
            setStatus(events[events.length - 1].status as OrderStatus);
          } else {
            setStatus(found.status as OrderStatus);
          }
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError("حدث خطأ في استلام البيانات من الخادم");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();

    channelRef.current = subscribeToOrderTrackingEvents(id, (payload) => {
      const newEvent = payload.new as TrackingEvent;
      setTracking((prev) => [...prev, newEvent]);
      setStatus(newEvent.status as OrderStatus);
    });

    return () => {
      if (channelRef.current) unsubscribeFromChannel(channelRef.current);
    };
  }, [id]);

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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

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
            تفاصيل الطلب <span className="text-blue-600">#{order.order_number || order.id.slice(0, 8)}</span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            {/* Status Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                الحالة الحالية ومفاتيح التحكم
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className={`text-2xl font-black px-6 py-3 rounded-2xl ${
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
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                      >
                        تأكيد الطلب
                      </button>
                      <button
                        onClick={() => runAction("canceled")}
                        disabled={actionLoading}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                      >
                        إلغاء
                      </button>
                    </>
                  )}

                  {status === "confirmed" && (
                    <>
                      <button
                        onClick={() => runAction("preparing")}
                        disabled={actionLoading}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                      >
                        بدء التجهيز
                      </button>
                      <button
                        onClick={() => runAction("canceled")}
                        disabled={actionLoading}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                      >
                        إلغاء
                      </button>
                    </>
                  )}

                  {status === "preparing" && (
                    <button
                      onClick={() => runAction("shipped")}
                      disabled={actionLoading}
                      className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                    >
                      تأكيد الشحن
                    </button>
                  )}

                  {status === "shipped" && (
                    <button
                      onClick={() => runAction("delivered")}
                      disabled={actionLoading}
                      className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                    >
                      إتمام التسليم
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* تفاصيل المنتجات - القسم الذي كان يظهر فارغاً */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800 border-b pb-4">
                <Package size={20} className="text-blue-600" /> محتويات الطلب (البنود)
              </div>

              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600 font-bold border border-slate-100">
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-slate-400">سعر الوحدة: {item.price.toFixed(2)} {order.currency}</p>
                        </div>
                      </div>
                      <div className="font-black text-slate-700">
                        {(item.price * item.quantity).toFixed(2)} <span className="text-[10px] text-slate-400 mr-1">{order.currency}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     <Info className="mx-auto text-slate-300 mb-2" size={32} />
                     <p className="text-slate-400 font-medium">لا توجد بيانات منتجات متوفرة لهذا الطلب</p>
                  </div>
                )}

                {/* تفاصيل الحساب */}
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                   <div className="flex justify-between text-sm text-slate-500 font-medium px-2">
                      <span>المجموع الفرعي:</span>
                      <span>{(order.subtotal || 0).toFixed(2)} {order.currency}</span>
                   </div>
                   <div className="flex justify-between text-sm text-slate-500 font-medium px-2">
                      <span>رسوم الشحن:</span>
                      <span>{(order.shipping_fee || 0).toFixed(2)} {order.currency}</span>
                   </div>
                   <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mt-4">
                      <div className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <Receipt size={18} className="text-blue-500" /> الإجمالي النهائي
                      </div>
                      <div className="text-2xl font-black text-blue-600">
                        {order.total.toFixed(2)} <span className="text-xs font-bold text-blue-400 mr-1">{order.currency}</span>
                      </div>
                   </div>
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
                  <p className="font-bold text-slate-700 tracking-wider" dir="ltr">
                    {order.customer_snapshot?.phone || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Sidebar */}
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
                    className={`w-7 h-7 rounded-full border-4 border-white shadow-sm flex-shrink-0 transition-colors duration-500 ${
                      e.status === "canceled"
                        ? "bg-red-500"
                        : i === tracking.length - 1
                        ? "bg-blue-600 animate-pulse"
                        : "bg-slate-200"
                    }`}
                  ></div>

                  <div>
                    <p className="font-bold text-sm text-slate-800 uppercase tracking-tight">
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