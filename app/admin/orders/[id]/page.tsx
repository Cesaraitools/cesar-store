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

        // 1. جلب الطلبات من مسار الأدمن (للحصول على بيانات العميل والحالة)
        const ordersRes = await fetch(`/api/admin/orders`);
        if (!ordersRes.ok) throw new Error("فشل جلب قائمة الطلبات");
        const ordersData = await ordersRes.json();
        const foundOrder = (ordersData.orders || []).find((o: any) => o.id === id);

        if (!foundOrder) {
          setError("الطلب غير موجود");
          return;
        }

        // 2. جلب سجل التتبع
        const trackingRes = await fetch(`/api/admin/order-tracking-events?orderId=${id}`);
        let events: TrackingEvent[] = [];
        if (trackingRes.ok) {
          const trackingData = await trackingRes.json();
          events = trackingData.events || [];
        }

        // 3. محاولة جلب المنتجات (Items) من مسار الأدمن التفصيلي إذا وجد
        // أو استخدام البيانات الموجودة في الكائن إذا كان الـ API يرسلها
        setOrder({
          ...foundOrder,
          items: foundOrder.items || [], // تأكد أن الـ API الخاص بالأدمن يرسل الـ items
          subtotal: foundOrder.subtotal || foundOrder.total,
          shipping_fee: foundOrder.shipping_fee || 0
        });

        setTracking(events);
        if (events.length > 0) {
          setStatus(events[events.length - 1].status as OrderStatus);
        } else {
          setStatus(foundOrder.status as OrderStatus);
        }

      } catch (err: any) {
        setError("خطأ في تحميل البيانات");
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
    if (!window.confirm(`هل أنت متأكد من تحويل الحالة إلى: ${nextStatus}؟`)) return;

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

  if (loading) return <div className="p-20 text-center font-bold text-blue-600 animate-pulse">جاري جلب بيانات الطلب...</div>;
  if (error || !order) return <div className="p-20 text-center text-red-500 font-bold">⚠️ {error}</div>;

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
            
            {/* 1. أزرار التحكم في الحالة (تمت استعادتها بالكامل) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans">إدارة حالة الطلب</p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className={`text-2xl font-black px-6 py-3 rounded-2xl ${status === "canceled" ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50"}`}>
                  {status}
                </div>
                <div className="flex flex-wrap gap-2">
                  {status === "requested" && (
                    <>
                      <button onClick={() => runAction("confirmed")} disabled={actionLoading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors">تأكيد</button>
                      <button onClick={() => runAction("canceled")} disabled={actionLoading} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">إلغاء</button>
                    </>
                  )}
                  {status === "confirmed" && (
                    <>
                      <button onClick={() => runAction("preparing")} disabled={actionLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">تجهيز</button>
                      <button onClick={() => runAction("canceled")} disabled={actionLoading} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">إلغاء</button>
                    </>
                  )}
                  {status === "preparing" && (
                    <button onClick={() => runAction("shipped")} disabled={actionLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">شحن</button>
                  )}
                  {status === "shipped" && (
                    <button onClick={() => runAction("delivered")} disabled={actionLoading} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">تسليم</button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. محتويات الطلب (الميزة الجديدة) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 font-sans">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800 border-b pb-4">
                <Package size={20} className="text-blue-600" /> محتويات الطلب
              </div>
              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600">{item.quantity}x</span>
                        <p className="font-bold text-slate-900">{item.name}</p>
                      </div>
                      <div className="font-black text-slate-700">{(item.price * item.quantity).toFixed(2)} {order.currency}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400 italic flex flex-col items-center gap-2">
                    <Info size={24} />
                    يتم جلب المنتجات من قاعدة البيانات...
                  </div>
                )}
              </div>
            </div>

            {/* 3. بيانات العميل (تمت استعادتها) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 font-sans">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800">
                <User size={20} className="text-blue-600" /> معلومات العميل
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1 font-bold">الاسم</p>
                  <p className="font-bold text-slate-900">{order.customer_snapshot?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1 font-bold">الهاتف</p>
                  <p className="font-bold text-slate-700 tracking-wider" dir="ltr">{order.customer_snapshot?.phone || "—"}</p>
                </div>
              </div>
            </div>

          </div>

          {/* 4. السجل المباشر (الجانبي) */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit font-sans">
            <h2 className="font-black text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
              <History size={18} className="text-blue-500" /> السجل المباشر
            </h2>
            <div className="space-y-6 relative">
              <div className="absolute right-3.5 top-0 bottom-0 w-px bg-slate-100"></div>
              {tracking.map((e, i) => (
                <div key={i} className="relative z-10 flex gap-4">
                  <div className={`w-7 h-7 rounded-full border-4 border-white shadow-sm flex-shrink-0 ${e.status === "canceled" ? "bg-red-500" : i === tracking.length - 1 ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`}></div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{e.status}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(e.created_at).toLocaleString("ar-EG")}</p>
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