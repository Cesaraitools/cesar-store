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
  Info,
  Printer
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

        // جلب تفاصيل الطلب (المنتجات والبيانات) من المسار العام للطلب
        // أزلنا أي باراميتر يتعلق بالبريد الإلكتروني لضمان جلب البيانات للأدمن
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error("تعذر جلب تفاصيل المنتجات");
        const data = await res.json();

        // جلب سجل التتبع
        const trackingRes = await fetch(`/api/admin/order-tracking-events?orderId=${id}`);
        let events: TrackingEvent[] = [];
        if (trackingRes.ok) {
          const trackingData = await trackingRes.json();
          events = trackingData.events || [];
        }

        setOrder(data);
        setTracking(events);
        
        // ضبط الحالة الحالية بناءً على آخر حدث تتبع أو حالة الطلب الأساسية
        if (events.length > 0) {
          setStatus(events[events.length - 1].status as OrderStatus);
        } else if (data.status) {
          setStatus(data.status as OrderStatus);
        }

      } catch (err: any) {
        setError("خطأ في تحميل بيانات الطلب");
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
    if (!window.confirm(`تغيير حالة الطلب إلى: ${nextStatus}؟`)) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/order-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, event: nextStatus }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="p-20 text-center font-bold text-blue-600 animate-pulse">جاري التحميل...</div>;
  if (error || !order) return <div className="p-20 text-center text-red-500 font-bold">⚠️ {error}</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/admin/orders" className="text-blue-600 flex items-center gap-1 text-sm font-bold hover:underline">
            <ChevronRight size={16} /> العودة
          </Link>
          <div className="flex items-center gap-4">
             <button className="p-2 bg-white border rounded-xl hover:bg-gray-50"><Printer size={18}/></button>
             <h1 className="text-2xl font-black text-slate-900">الطلب #{order.order_number || order.id.slice(0,8)}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* الحالة والتحكم */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="px-6 py-3 rounded-2xl bg-blue-50 text-blue-600 font-black text-xl">
                  {status}
                </div>
                <div className="flex gap-2">
                  {status === "requested" && (
                    <button onClick={() => runAction("confirmed")} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">تأكيد</button>
                  )}
                  {status === "confirmed" && (
                    <button onClick={() => runAction("preparing")} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">تجهيز</button>
                  )}
                  {status === "preparing" && (
                    <button onClick={() => runAction("shipped")} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">شحن</button>
                  )}
                  {status === "shipped" && (
                    <button onClick={() => runAction("delivered")} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold">تسليم</button>
                  )}
                  {status !== "delivered" && status !== "canceled" && (
                    <button onClick={() => runAction("canceled")} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold">إلغاء</button>
                  )}
                </div>
              </div>
            </div>

            {/* تفاصيل المنتجات */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <Package className="text-blue-600" size={20}/> محتويات الطلب
              </h3>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-blue-600 border shadow-sm">{item.quantity}</span>
                      <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                    <span className="font-black text-slate-700">{item.price} {order.currency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* بيانات العميل */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
               <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <User className="text-blue-600" size={20}/> بيانات العميل
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-slate-400 mb-1">الاسم</p>
                  <p className="font-bold">{order.customer_snapshot?.name || "—"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-slate-400 mb-1">الهاتف</p>
                  <p className="font-bold tracking-widest">{order.customer_snapshot?.phone || "—"}</p>
                </div>
              </div>
            </div>

          </div>

          {/* سجل التتبع */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
              <History className="text-blue-600" size={20}/> التحديثات اللحظية
            </h3>
            <div className="space-y-6 relative pr-4">
              <div className="absolute right-3.5 top-0 bottom-0 w-px bg-slate-100"></div>
              {tracking.map((e, i) => (
                <div key={i} className="relative z-10 flex gap-4">
                  <div className={`w-7 h-7 rounded-full border-4 border-white shadow-sm ${e.status === "canceled" ? "bg-red-500" : i === tracking.length-1 ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`}></div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{e.status}</p>
                    <p className="text-[10px] text-slate-400">{new Date(e.created_at).toLocaleString("ar-EG")}</p>
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