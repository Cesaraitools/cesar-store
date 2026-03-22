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
  total: number;
  currency: string;
  created_at: string;
  status?: string;
  customer_snapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items?: OrderItem[];
  subtotal?: number;
  shipping_fee?: number;
  order_number?: string;
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

        const orderRes = await fetch(`/api/admin/orders`);
        if (!orderRes.ok) throw new Error("تعذر الوصول لمسار الطلبات");

        const orderData = await orderRes.json();
        const found = (orderData.orders || []).find(
          (o: OrderDetails) => o.id === id
        );

        if (!found) {
          setError("الطلب غير موجود في النظام");
          return;
        }

        const detailsRes = await fetch(`/api/admin/orders/${id}`);
        let finalOrder = { ...found };
        
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (detailsData.order) {
            finalOrder = {
              ...found,
              items:
                detailsData.order.items ||
                detailsData.order.items_snapshot ||
                [],
              subtotal: detailsData.order.subtotal,
              shipping_fee: detailsData.order.shipping_fee,
              order_number: detailsData.order.order_number
            };
          }
        }

        setOrder(finalOrder);

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

      // 🔥 FIX Realtime
      setOrder((prev) =>
        prev ? { ...prev, status: newEvent.status } : prev
      );
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, event: nextStatus }),
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
      <div className="p-20 text-center text-red-500 font-bold">⚠️ {error}</div>
    );
    return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right" dir="rtl">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/admin/orders" className="text-blue-600 flex items-center gap-1 text-sm font-bold hover:underline">
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
                      <button onClick={() => runAction("confirmed")} disabled={actionLoading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">
                        تأكيد
                      </button>
                      <button onClick={() => runAction("canceled")} disabled={actionLoading} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">
                        إلغاء
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800 border-b pb-4">
                <Package size={20} className="text-blue-600" /> محتويات الطلب
              </div>

              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <div>{item.name} × {item.quantity}</div>
                      <div>{(item.price * item.quantity).toFixed(2)} {order.currency}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400">لا توجد بيانات</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}