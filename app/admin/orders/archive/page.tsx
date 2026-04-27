"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  total: number;
  currency: string;
  created_at: string;
  customer_snapshot?: {
    name?: string;
  };
};

export default function ArchivedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 tracking لكل زر لوحده
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/orders?archived=true");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // 🔁 Restore
  async function handleRestore(id: string) {
    if (!confirm("Restore this order?")) return;

    setProcessingId(id);

    try {
      const res = await fetch("/api/admin/orders/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        console.error("Restore failed");
        return;
      }

      // ✅ update UI بدون reload
      setOrders((prev) => prev.filter((o) => o.id !== id));

      alert("تم استرجاع الطلب بنجاح");
    } catch (err) {
      console.error("Restore error:", err);
    } finally {
      setProcessingId(null);
    }
  }

  // ❌ Delete
  async function handleDelete(id: string) {
    if (!confirm("Delete permanently?")) return;

    setProcessingId(id);

    try {
      const res = await fetch("/api/admin/orders/hard-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        console.error("Delete failed");
        return;
      }

      // ✅ update UI بدون reload
      setOrders((prev) => prev.filter((o) => o.id !== id));

      alert("تم حذف الطلب نهائياً");
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading)
    return (
      <div className="p-10 text-center">جاري تحميل الأرشيف...</div>
    );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-black">📦 الطلبات المؤرشفة</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">لا يوجد طلبات مؤرشفة</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="p-4 border rounded-xl flex justify-between items-center"
            >
              <div>
                <p className="font-bold">#{o.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-500">
                  {o.customer_snapshot?.name || "—"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {o.total} {o.currency}
                </span>

                {/* 🔁 Restore */}
                <button
                  onClick={() => handleRestore(o.id)}
                  disabled={processingId === o.id}
                  className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {processingId === o.id ? "..." : "Restore"}
                </button>

                {/* ❌ Hard Delete */}
                <button
                  onClick={() => handleDelete(o.id)}
                  disabled={processingId === o.id}
                  className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {processingId === o.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}