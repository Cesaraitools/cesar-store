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
  History,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
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

        // جلب البيانات من مسار الأدمن لضمان الصلاحية الكاملة ورؤية كل الطلبات
        const res = await fetch(`/api/admin/orders`);
        if (!res.ok) throw new Error("فشل الوصول لبيانات الإدارة");
        const data = await res.json();
        
        // البحث عن الطلب المحدد
        const found = (data.orders || []).find((o: any) => o.id === id);

        if (!found) {
          setError("الطلب غير موجود");
          return;
        }

        // جلب سجل التتبع
        const trackingRes = await fetch(`/api/admin/order-tracking-events?orderId=${id}`);
        let events: TrackingEvent[] = [];
        if (trackingRes.ok) {
          const trackingData = await trackingRes.json();
          events = trackingData.events || [];
        }

        setOrder(found);
        setTracking(events);
        setStatus((events.length > 0 ? events[events.length - 1].status : found.status) as OrderStatus);

      } catch (err: any) {
        setError("حدث خطأ في جلب البيانات");
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
    if (!window.confirm(`هل تريد تغيير حالة الطلب إلى ${nextStatus}؟`)) return;

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

  if (loading) return <div className="p-20 text-center font-bold text-blue-600 animate-pulse">جاري تحميل تفاصيل الطلب...</div>;
  if (error || !order) return <div className="p-20 text-center text-red-500 font-bold">⚠️ {error}</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/admin/orders" className="text-blue-600 flex items-center gap-1 text-sm font-bold hover:underline">
            <ChevronRight size={16} /> العودة للطلبات
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={() => window.print()} className="p-2 bg-white border rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              <Printer size={18} className="text-slate-600" />
            </button>
            <h1 className="text-2xl font-black text-slate-900">تفاصيل الطلب</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Card & Actions */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الحالة الحالية</p>
                  <div className={`text-2xl font-black ${status === 'canceled' ? 'text-red-600' : 'text-blue-600'}`}>
                    {status}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {status === "requested" && (
                    <>
                      <button onClick={() => runAction("confirmed")} disabled={actionLoading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all">تأكيد</button>
                      <button onClick={() => runAction("canceled")} disabled={actionLoading} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition-all">إلغاء</button>
                    </>
                  )}
                  {status === "confirmed" && (
                    <button onClick={() => runAction("preparing")} disabled={actionLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">بدء التجهيز</button>
                  )}
                  {status === "preparing" && (
                    <button onClick={() => runAction("shipped")} disabled={actionLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">تم الشحن</button>
                  )}
                  {status === "shipped" && (
                    <button onClick={() => runAction("delivered")} disabled={actionLoading} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all">تم التسليم</button>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <User size={20} className="text-blue-600" /> بيانات العميل
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="الاسم" value={order.customer_snapshot?.name} />
                <InfoItem label="رقم الهاتف" value={order.customer_snapshot?.phone} isLtr />
                <InfoItem label="البريد الإلكتروني" value={order.customer_snapshot?.email || "—"} isLtr />
                <InfoItem label="رقم الطلب" value={`#${order.order_number || order.id.slice(0,8)}`} />
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Package size={20} className="text-blue-600" /> محتويات الطلب
              </h3>
              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-blue-600">{item.quantity}</span>
                        <p className="font-bold text-slate-800">{item.name}</p>
                      </div>
                      <p className="font-black text-slate-900">{item.price} {order.currency}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-4 italic">لا توجد تفاصيل للمنتجات حالياً</p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit">
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

function InfoItem({ label, value, isLtr }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`font-bold text-slate-900 ${isLtr ? 'font-sans' : ''}`} dir={isLtr ? 'ltr' : 'rtl'}>{value || "—"}</p>
    </div>
  );
}