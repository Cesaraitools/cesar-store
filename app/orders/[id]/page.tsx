"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Circle, Clock, Package, Truck, Check, AlertCircle } from "lucide-react";

/* ================================
Types
================================ */

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type OrderDetails = {
  order_id: string;
  order_number: string;
  created_at: string;
  currency: string;
  status: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  timeline: Array<{
    status: string;
    completed: boolean;
  }>;
};

type OrderDetailsResponse = {
  order: OrderDetails | null;
};

/* ================================
Helpers
================================ */

function normalizeStatus(status: string | null) {
  return status?.toLowerCase().trim() ?? null;
}

function mapToTimelineStatus(status: string | null) {
  const s = normalizeStatus(status);
  switch (s) {
    case "created":
    case "requested":
      return "requested";
    case "confirmed":
      return "confirmed";
    case "processing":
    case "preparing":
      return "preparing";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "canceled":
      return "canceled";
    default:
      return null;
  }
}

function statusLabel(status: string | null) {
  const s = normalizeStatus(status);
  switch (s) {
    case "created":
    case "requested":
      return "تم استلام الطلب";
    case "confirmed":
      return "تم تأكيد الطلب";
    case "processing":
    case "preparing":
      return "جاري التحضير";
    case "shipped":
      return "تم الشحن";
    case "delivered":
      return "تم التسليم";
    case "canceled":
      return "تم إلغاء الطلب";
    default:
      return "غير معروف";
  }
}

function statusColor(status: string | null) {
  const s = normalizeStatus(status);
  switch (s) {
    case "delivered":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "canceled":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
}

function getStatusIcon(status: string | null, isCurrent: boolean) {
  const s = normalizeStatus(status);
  const iconClass = isCurrent ? "w-5 h-5" : "w-4 h-4";
  
  switch (s) {
    case "requested": return <Clock className={iconClass} />;
    case "confirmed": return <CheckCircle2 className={iconClass} />;
    case "preparing": return <Package className={iconClass} />;
    case "shipped": return <Truck className={iconClass} />;
    case "delivered": return <Check className={iconClass} />;
    case "canceled": return <AlertCircle className={iconClass} />;
    default: return <Circle className={iconClass} />;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-EG", { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/* ================================
Page
================================ */

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : undefined;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 404) {
        router.replace("/orders");
        return;
      }

      if (!res.ok) throw new Error("Failed to load order");

      const json = (await res.json()) as OrderDetailsResponse;
      if (json.order) {
        const subtotal = json.order.subtotal ?? 0;
        const total = json.order.total ?? 0;
        const shipping = json.order.shipping_fee && json.order.shipping_fee > 0
            ? json.order.shipping_fee
            : Math.max(total - subtotal, 0);

        setOrder({
          ...json.order,
          shipping_fee: shipping,
        });
      }
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) load();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel("order-tracking")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_tracking_events" },
        (payload) => {
          const newEvent = payload.new as any;
          if (newEvent.order_id !== orderId) return;

          const status = normalizeStatus(newEvent.status);
          setOrder((prev) => {
            if (!prev) return prev;
            const updatedTimeline = prev.timeline.map((step) => {
              if (normalizeStatus(step.status) === status) {
                return { ...step, completed: true };
              }
              return step;
            });
            return { ...prev, status, timeline: updatedTimeline };
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  if (!orderId || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground animate-pulse">جاري تحميل تفاصيل الطلب…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto mt-20">
        <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="text-red-600 w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-red-600">
          {error ? "حدث خطأ أثناء تحميل الطلب" : "الطلب غير موجود"}
        </p>
        <button onClick={() => router.push('/orders')} className="text-sm text-blue-600 hover:underline">العودة للطلبات</button>
      </div>
    );
  }

  const mappedStatus = mapToTimelineStatus(order.status);
  const currentIndex = order.timeline.findIndex(
    (s) => normalizeStatus(s.status) === mappedStatus
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
            <span>طلباتي</span>
            <span>/</span>
            <span className="text-muted-foreground">تفاصيل الطلب</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            طلب <span className="text-blue-600">#{order.order_number}</span>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            تاريخ الطلب: {formatDate(order.created_at)}
          </p>
        </div>
        
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${statusColor(order.status)} uppercase tracking-wider shadow-sm`}>
          {statusLabel(order.status)}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            حالة التتبع
          </h2>
          <div className="relative pr-2">
            {order.timeline.map((step, index) => {
              const isCurrent = index === currentIndex;
              const isCompleted = step.completed || index < currentIndex;
              const isLast = index === order.timeline.length - 1;

              return (
                <div key={step.status} className="relative flex gap-6 pb-10">
                  {/* Line Connector */}
                  {!isLast && (
                    <div className={`absolute right-4 top-8 w-[2px] h-full ${isCompleted ? 'bg-blue-600' : 'bg-gray-100'}`} />
                  )}
                  
                  {/* Status Icon Node */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 ${
                    isCurrent 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110' 
                      : isCompleted 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-25"></span>
                    )}
                    {getStatusIcon(step.status, isCurrent)}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-bold transition-colors ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {statusLabel(step.status)}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-blue-500 font-medium">الوضع الحالي</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            ملخص المنتجات
          </h2>
          
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={`${item.name}-${item.price}`} className="p-5 flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="text-sm font-bold group-hover:text-blue-600 transition-colors">{item.name}</p>
                    <p className="text-xs text-muted-foreground italic">الكمية: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {(item.price * item.quantity).toFixed(2)} <span className="text-[10px] text-muted-foreground mr-1">{order.currency}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50/50 p-6 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{order.subtotal.toFixed(2)} {order.currency}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>رسوم الشحن</span>
                <span>{order.shipping_fee.toFixed(2)} {order.currency}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">الإجمالي النهائي</p>
                  <p className="text-2xl font-black text-blue-600 leading-none">
                    {order.total.toFixed(2)}
                    <span className="text-xs font-bold text-blue-400 mr-1">{order.currency}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}