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
  const [error, setError] = useState<string | null>(null);

  async function postAction(
    url: string,
    ids: string[],
    resultKey: "restoredIds" | "deletedIds"
  ) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.success !== true) {
      throw new Error(data?.error || "تعذر تنفيذ العملية");
    }

    const affectedIds = Array.isArray(data?.[resultKey])
      ? data[resultKey].map(String)
      : [];

    if (
      affectedIds.length !== ids.length ||
      ids.some((id) => !affectedIds.includes(id))
    ) {
      throw new Error("لم يؤكد الخادم تنفيذ العملية على جميع الطلبات");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/orders?archived=true", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("تعذر تحميل الأرشيف");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
        setError("تعذر تحميل الطلبات المؤرشفة");
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
    if (!confirm("هل تريد استعادة هذا الطلب؟ سيعود للظهور في قائمة الطلبات النشطة.")) return;

    setProcessingId(id);
    setError(null);

    try {
      await postAction("/api/admin/orders/restore", [id], "restoredIds");

      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));

      toast.success("تمت استعادة الطلب");
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "فشل الاسترجاع";
      setError(message);
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        `حذف نهائي للطلب #${id.slice(0, 8)}؟ لا يمكن التراجع عن هذه العملية.`
      )
    ) return;

    setProcessingId(id);
    setError(null);

    try {
      await postAction("/api/admin/orders/hard-delete", [id], "deletedIds");

      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));

      toast.success("تم حذف الطلب نهائيًا");
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "فشل الحذف النهائي";
      setError(message);
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleBulkRestore() {
    if (!selectedIds.length) return;
    if (
      !confirm(
        `استعادة ${selectedIds.length} طلب؟ ستعود الطلبات المحددة إلى القائمة النشطة.`
      )
    ) return;

    const ids = [...selectedIds];
    setProcessingId("bulk-restore");
    setError(null);
    try {
      await postAction("/api/admin/orders/restore", ids, "restoredIds");
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      setSelectedIds([]);
      toast.success("تمت استعادة الطلبات المحددة");
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "فشل الاسترجاع";
      setError(message);
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (
      !confirm(
        `حذف نهائي لعدد ${selectedIds.length} طلب؟ سيتم حذف الفواتير والتفاصيل المرتبطة ولا يمكن التراجع.`
      )
    ) return;

    const ids = [...selectedIds];
    setProcessingId("bulk-delete");
    setError(null);
    try {
      await postAction("/api/admin/orders/hard-delete", ids, "deletedIds");
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      setSelectedIds([]);
      toast.success("تم حذف الطلبات المحددة نهائيًا");
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "فشل الحذف النهائي";
      setError(message);
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading)
    return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-black">📦 الطلبات المؤرشفة</h1>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
        الاستعادة تعيد الطلب إلى القائمة النشطة. الحذف النهائي يزيل الطلب
        وفاتورته نهائيًا ولا يظهر نجاح العملية إلا بعد تأكيد قاعدة البيانات.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-white border rounded-xl p-3 flex gap-3 shadow">
          <span className="text-sm font-bold">
            {selectedIds.length} محدد
          </span>

          <button
            onClick={handleBulkRestore}
            disabled={processingId !== null}
            className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg"
          >
            {processingId === "bulk-restore" ? "جاري الاستعادة..." : "استعادة المحدد"}
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={processingId !== null}
            className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
          >
            {processingId === "bulk-delete" ? "جاري الحذف..." : "حذف المحدد نهائيًا"}
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
            <span className="text-sm text-gray-600">تحديد الكل</span>
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
                  {processingId === o.id ? "..." : "استعادة"}
                </button>

                <button
                  onClick={() => handleDelete(o.id)}
                  disabled={processingId === o.id}
                  className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  {processingId === o.id ? "..." : "حذف نهائي"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
