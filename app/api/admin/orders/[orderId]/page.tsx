"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type TrackingEvent = {
  event: string;
  created_at: string;
  actor_type?: string;
};

type OrderDetails = {
  id: string;
  total: number;
  currency: string;
  created_at: string;
  status: string;
  customer_snapshot: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items?: {
    name: string;
    price: number;
    quantity: number;
  }[];
  tracking?: TrackingEvent[];
};

export default function AdminOrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/orders");
        if (!res.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await res.json();
        const found = (data.orders || []).find(
          (o: OrderDetails) => o.id === orderId
        );

        if (!found) {
          setError("الطلب غير موجود");
          return;
        }

        setOrder(found);
      } catch {
        setError("حدث خطأ أثناء تحميل الطلب");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        جاري تحميل الطلب...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "حدث خطأ غير متوقع"}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/orders"
          className="text-blue-600 hover:underline text-sm"
        >
          ← العودة إلى الطلبات
        </Link>

        <h1 className="text-2xl font-bold mt-2">
          Order #{order.id}
        </h1>

        <p className="text-gray-500 text-sm">
          {new Date(order.created_at).toLocaleString()}
        </p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-2">الحالة الحالية</h2>
        <span className="inline-block px-3 py-1 rounded bg-gray-200 text-sm">
          {order.status}
        </span>
      </div>

      {/* Customer */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4">بيانات العميل</h2>
        <p>الاسم: {order.customer_snapshot?.name || "—"}</p>
        <p>البريد: {order.customer_snapshot?.email || "—"}</p>
        <p>الهاتف: {order.customer_snapshot?.phone || "—"}</p>
        <p>العنوان: {order.customer_snapshot?.address || "—"}</p>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4">المنتجات</h2>

        {order.items && order.items.length > 0 ? (
          <ul className="space-y-2">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>
                  {item.price * item.quantity} {order.currency}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            لا توجد عناصر
          </p>
        )}

        <div className="border-t mt-4 pt-4 font-bold text-right">
          الإجمالي: {order.total} {order.currency}
        </div>
      </div>

      {/* Tracking */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4">تتبع الطلب</h2>

        {order.tracking && order.tracking.length > 0 ? (
          <ul className="space-y-3">
            {order.tracking.map((e, idx) => (
              <li key={idx} className="text-sm">
                <div className="font-medium">
                  {e.event}
                </div>
                <div className="text-gray-500 text-xs">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            لا توجد أحداث تتبع بعد
          </p>
        )}
      </div>

      {/* Invoice */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4">الفاتورة</h2>

        <div className="flex gap-4">
          <a
            href={`/api/invoice/${order.id}`}
            target="_blank"
            className="text-blue-600 hover:underline text-sm"
          >
            عرض JSON
          </a>

          <a
            href={`/api/invoice/${order.id}/pdf`}
            target="_blank"
            className="text-blue-600 hover:underline text-sm"
          >
            تحميل PDF
          </a>
        </div>
      </div>
    </div>
  );
}