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
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/admin/orders/restore", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ id: o.id }),
                      });

                      if (!res.ok) {
                        console.error("Restore failed");
                        return;
                      }

                      location.reload();
                    } catch (err) {
                      console.error("Restore error:", err);
                    }
                  }}
                  className="text-xs bg-green-500 text-white px-3 py-1 rounded"
                >
                  Restore
                </button>

                {/* ❌ Hard Delete */}
                <button
                  onClick={async () => {
                    if (!confirm("Delete permanently?")) return;

                    try {
                      const res = await fetch("/api/admin/orders/hard-delete", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ id: o.id }),
                      });

                      if (!res.ok) {
                        console.error("Delete failed");
                        return;
                      }

                      location.reload();
                    } catch (err) {
                      console.error("Delete error:", err);
                    }
                  }}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}