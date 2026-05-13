"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast"; // ✅ إضافة

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

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  }

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

      if (!res.ok) return;

      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));

      toast.success("تم الاسترجاع"); // ✅ بدل alert
    } finally {
      setProcessingId(null);
    }
  }

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

      if (!res.ok) return;

      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));

      toast.success("تم الحذف"); // ✅ بدل alert
    } finally {
      setProcessingId(null);
    }
  }

  async function handleBulkRestore() {
    if (!selectedIds.length) return;
    if (!confirm("Restore selected orders?")) return;

    await Promise.all(
      selectedIds.map((id) =>
        fetch("/api/admin/orders/restore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        })
      )
    );

    setOrders((prev) =>
      prev.filter((o) => !selectedIds.includes(o.id))
    );

    setSelectedIds([]);
    toast.success("تم الاسترجاع بنجاح"); // ✅
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm("Delete selected permanently?")) return;

    await Promise.all(
      selectedIds.map((id) =>
        fetch("/api/admin/orders/hard-delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        })
      )
    );

    setOrders((prev) =>
      prev.filter((o) => !selectedIds.includes(o.id))
    );

    setSelectedIds([]);
    toast.success("تم حذف الطلب/الطلبات بنجاح"); // ✅
  }

  if (loading)
    return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-black">📦 الطلبات المؤرشفة</h1>

      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-white border rounded-xl p-3 flex gap-3 shadow">
          <span className="text-sm font-bold">
            {selectedIds.length} محدد
          </span>

          <button
            onClick={handleBulkRestore}
            className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg"
          >
            Restore
          </button>

          <button
            onClick={handleBulkDelete}
            className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
          >
            Delete
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-gray-500">لا يوجد طلبات</p>
      ) : (
        <div className="space-y-3">

          <div className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              checked={
                orders.length > 0 &&
                selectedIds.length === orders.length
              }
              onChange={toggleSelectAll}
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>

          {orders.map((o) => (
            <div
              key={o.id}
              className={`p-4 border rounded-xl flex justify-between items-center ${
                selectedIds.includes(o.id)
                  ? "bg-blue-50 border-blue-300"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(o.id)}
                onChange={() => toggleSelect(o.id)}
              />

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

                <button
                  onClick={() => handleRestore(o.id)}
                  disabled={processingId === o.id}
                  className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg"
                >
                  {processingId === o.id ? "..." : "Restore"}
                </button>

                <button
                  onClick={() => handleDelete(o.id)}
                  disabled={processingId === o.id}
                  className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
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