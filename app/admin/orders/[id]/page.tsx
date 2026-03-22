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

        // الحل: نستخدم مسار API الأدمن الذي يملك صلاحية رؤية كل شيء
        // سنقوم بجلب الطلب المحدد مباشرة من مسار الأدمن (بفرض أن المسار يدعم الاستعلام)
        const res = await fetch(`/api/admin/orders`); 
        if (!res.ok) throw new Error("تعذر الوصول لبيانات الأدمن");

        const data = await res.json();
        // البحث عن الطلب في قائمة الأدمن الكلية
        const found = (data.orders || []).find((o: any) => o.id === id);

        if (!found) {
          setError("الطلب غير موجود أو لا تملك صلاحية الوصول إليه");
          return;
        }

        /* ملاحظة هامة: إذا كان مسار /api/admin/orders لا يعيد 'items' 
           يجب التأكد من وجود مسار مثل /api/admin/orders/${id} 
           أو تعديل الـ API ليرسل البيانات كاملة للأدمن.
        */
        
        setOrder({
          ...found,
          // هنا نتأكد من دمج البيانات حتى لو كانت قادمة من حقول مختلفة في قاعدة البيانات
          items: found.items || [], 
          subtotal: found.subtotal || found.total,
          shipping_fee: found.shipping_fee || 0
        });

        // جلب سجل تتبع الأحداث
        const trackingRes = await fetch(`/api/admin/order-tracking-events?orderId=${id}`);
        if (trackingRes.ok) {
          const trackingData = await trackingRes.json();
          setTracking(trackingData.events || []);
          if (trackingData.events?.length > 0) {
            setStatus(trackingData.events[trackingData.events.length - 1].status as OrderStatus);
          } else {
            setStatus(found.status as OrderStatus);
          }
        }

      } catch (err: any) {
        setError("حدث خطأ أثناء جلب تفاصيل الطلب");
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

  // ... (باقي وظائف runAction والـ UI تظل كما هي دون تغيير)
  // سأختصر العرض هنا للحفاظ على التركيز على حل المشكلة البرمجية
  
  if (loading) return <div className="p-20 text-center font-bold text-blue-600 animate-pulse">جاري تحميل بيانات الطلب للأدمن...</div>;
  if (error || !order) return <div className="p-20 text-center text-red-500 font-bold">⚠️ {error}</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 px-4 md:px-8 pt-8 text-right" dir="rtl">
      {/* ... (نفس تصميم الواجهة السابق مع عرض order.items و order.customer_snapshot) */}
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/admin/orders" className="text-blue-600 flex items-center gap-1 text-sm font-bold hover:underline">
            <ChevronRight size={16} /> العودة للطلبات
          </Link>
          <h1 className="text-2xl font-black text-slate-900">لوحة تحكم الطلب</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* عرض محتويات الطلب (الميزة المطلوبة) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
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
                  <p className="text-center text-slate-400 italic">لا توجد تفاصيل بنود متاحة لهذا الطلب في قاعدة البيانات</p>
                )}
              </div>
            </div>

            {/* عرض بيانات العميل (التي كانت تختفي) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 font-black text-slate-800">
                <User size={20} className="text-blue-600" /> بيانات صاحب الطلب
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">الاسم الكامل</p>
                  <p className="font-bold text-slate-900">{order.customer_snapshot?.name || "عميل غير مسجل"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">رقم التواصل</p>
                  <p className="font-bold text-slate-700 tracking-wider" dir="ltr">{order.customer_snapshot?.phone || "—"}</p>
                </div>
              </div>
            </div>

          </div>

          {/* السجل المباشر */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit">
            <h2 className="font-black text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
              <History size={18} className="text-blue-500" /> السجل المباشر
            </h2>
            {/* ... (نفس كود التتبع الزمني) */}
          </div>
        </div>
      </div>
    </div>
  );
}