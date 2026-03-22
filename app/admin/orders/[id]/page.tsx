"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  subscribeToOrderTrackingEvents,
  unsubscribeFromChannel,
  supabase // تأكد من استيراد supabaseClient
} from "@/lib/supabaseClient";
import {
  ChevronRight,
  Printer,
  User,
  History,
  Package,
  Receipt
} from "lucide-react";

/* ---------------- Types ---------------- */
type TrackingEvent = {
  status: string;
  created_at: string;
};

type OrderStatus = "requested" | "confirmed" | "preparing" | "shipped" | "delivered" | "canceled";

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
  customer_snapshot?: { name?: string; email?: string; phone?: string; };
  items?: OrderItem[];
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

    async function loadData() {
      try {
        setLoading(true);
        
        // 1. جلب بيانات الطلب الأساسية من مسار الأدمن
        const adminRes = await fetch(`/api/admin/orders`);
        const adminData = await adminRes.json();
        const found = (adminData.orders || []).find((o: any) => o.id === id);

        if (!found) throw new Error("الطلب غير موجود");

        // 2. الحل الجذري: جلب الأصناف مباشرة من قاعدة البيانات للأدمن (تخطي الـ API المحمي)
        // نقوم بالاستعلام عن جدول order_items حيث order_id يساوي id الطلب الحالي
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items') 
          .select('*')
          .eq('order_id', id);

        // 3. جلب سجل التتبع
        const trackingRes = await fetch(`/api/admin/order-tracking-events?orderId=${id}`);
        const tData = trackingRes.ok ? await trackingRes.json() : { events: [] };

        setOrder({
          ...found,
          items: itemsData || [] // نضع البيانات القادمة مباشرة من الجدول
        });

        setTracking(tData.events || []);
        setStatus((tData.events?.length > 0 ? tData.events[tData.events.length - 1].status : found.status) as OrderStatus);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    channelRef.current = subscribeToOrderTrackingEvents(id, (payload) => {
      const newEvent = payload.new as TrackingEvent;
      setTracking((prev) => [...prev, newEvent]);
      setStatus(newEvent.status as OrderStatus);
    });

    return () => { if (channelRef.current) unsubscribeFromChannel(channelRef.current); };
  }, [id]);

  async function runAction(nextStatus: OrderStatus) {
    if (!order || actionLoading) return;
    try {
      setActionLoading(true);
      await fetch("/api/admin/order-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, event: nextStatus }),
      });
    } catch (e) { alert("خطأ في التحديث"); } finally { setActionLoading(false); }
  }

  if (loading) return <div className="p-20 text-center font-black text-blue-600 animate-pulse">جاري جلب تفاصيل سيزر...</div>;
  if (error || !order) return <div className="p-20 text-center text-red-500 font-bold">⚠️ {error}</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/admin/orders" className="text-blue-600 flex items-center gap-1 text-sm font-bold">
            <ChevronRight size={16} /> العودة
          </Link>
          <h1 className="text-2xl font-black text-slate-900">طلب رقم #{order.order_number || order.id.slice(0,8)}</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status & Control */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
               <div className="flex justify-between items-center">
                  <div className="text-2xl font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-2xl">{status}</div>
                  <div className="flex gap-2">
                    {status === "requested" && <button onClick={() => runAction("confirmed")} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">تأكيد</button>}
                    {status === "confirmed" && <button onClick={() => runAction("preparing")} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">تجهيز</button>}
                    {status === "preparing" && <button onClick={() => runAction("shipped")} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">شحن</button>}
                    {status === "shipped" && <button onClick={() => runAction("delivered")} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold">تسليم</button>}
                  </div>
               </div>
            </div>

            {/* محتويات الطلب المباشرة */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
                <Package size={20} className="text-blue-600" /> محتويات الطلب (الأصناف)
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
                  <div className="text-center py-6 text-slate-400 italic">
                    <p>لا توجد أصناف مرتبطة بهذا المعرف في جدول order_items</p>
                    <p className="text-[10px]">ID: {order.id}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <User size={20} className="text-blue-600" /> بيانات العميل
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">الاسم</p>
                  <p className="font-bold text-slate-900">{order.customer_snapshot?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">الهاتف</p>
                  <p className="font-bold text-slate-900 tracking-widest">{order.customer_snapshot?.phone || "—"}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Timeline */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit">
            <h2 className="font-black text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
              <History size={18} className="text-blue-500" /> السجل المباشر
            </h2>
            <div className="space-y-6 relative pr-2">
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