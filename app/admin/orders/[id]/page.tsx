"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  subscribeToOrderTrackingEvents,
  unsubscribeFromChannel
} from "@/lib/supabaseClient";
import {
  ChevronRight,
  User,
  History,
  Package,
  Receipt,
  Loader2,
  CheckCircle2,
  Clock
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
  image?: string;
};

type OrderDetails = {
  id: string;
  total: number;
  currency: string;
  created_at: string;
  status: string;
  order_number?: string;
  customer_snapshot?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  order_items?: OrderItem[];
};

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  /* ---------------- Fetch Data ---------------- */
  async function fetchFullOrder() {
    try {
      setLoading(true);

      // ✅ API بدل Supabase
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const orderData = data.order;

      setOrder({
        ...orderData,
        order_items: orderData.items || []
      });

      setTracking(orderData.tracking || []);

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    fetchFullOrder();

    const channel = subscribeToOrderTrackingEvents(id, () => {
      // ✅ realtime fix
      fetchFullOrder();
    });

    return () => {
      if (channel) unsubscribeFromChannel(channel);
    };
  }, [id]);

  /* ---------------- Update Logic ---------------- */
  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!id || updating) return;

    try {
      setUpdating(true);

      const res = await fetch("/api/admin/order-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, event: newStatus }),
      });

      if (!res.ok) throw new Error("Update failed");

      await fetchFullOrder();

    } catch (err) {
      console.error("Update error:", err);
      alert("فشل تحديث الحالة");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!order) return <div className="p-10 text-center font-bold">الطلب غير موجود</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-10 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
              <ChevronRight className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                طلب #{order.order_number || order.id.slice(0, 8)}
              </h1>
              <p className="text-slate-400 font-bold text-sm">
                {new Date(order.created_at).toLocaleString("ar-EG")}
              </p>
            </div>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 mr-2">حالة الطلب:</span>
            <select
              value={order.status}
              disabled={updating}
              onChange={(e) => updateOrderStatus(e.target.value as OrderStatus)}
              className="bg-slate-50 rounded-xl text-sm font-bold px-4 py-2"
            >
              <option value="requested">تم إستلام الطلب</option>
              <option value="confirmed">تم التأكيد</option>
              <option value="preparing">جاري التجهيز</option>
              <option value="shipped">جاري الشحن</option>
              <option value="delivered">تم التوصيل</option>
              <option value="canceled">ملغي</option>
            </select>
          </div>
        </div>

        {/* باقي UI كما هو بدون أي تغيير */}
      </div>
    </div>
  );
}