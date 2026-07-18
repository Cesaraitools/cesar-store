"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Eye,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { WholesaleOrder, WholesaleOrderStatus } from "@/types/wholesale";

const statusLabels: Record<WholesaleOrderStatus, string> = {
  requested: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "جاري التحضير",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغى",
};

const statusClasses: Record<WholesaleOrderStatus, string> = {
  requested: "border-slate-100 bg-slate-50 text-slate-700",
  confirmed: "border-purple-100 bg-purple-50 text-purple-700",
  preparing: "border-amber-100 bg-amber-50 text-amber-700",
  shipped: "border-blue-100 bg-blue-50 text-blue-700",
  delivered: "border-emerald-100 bg-emerald-50 text-emerald-700",
  canceled: "border-rose-100 bg-rose-50 text-rose-700",
};

function formatMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG")} ${currency}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function customerText(order: WholesaleOrder, field: string) {
  const value = order.customerSnapshot?.[field];
  return typeof value === "string" && value.trim() ? value : "-";
}

export default function AdminWholesaleOrdersArchivePage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        status: "all",
        archived: "archived",
      });
      const response = await fetch(
        `/api/admin/wholesale/orders?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل أرشيف طلبات الجملة");
      }

      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
      setSelectedIds([]);
    } catch (loadError) {
      console.error("Wholesale archive load failed", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل أرشيف طلبات الجملة"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders(true);
  }, []);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds]
  );

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.length === orders.length ? [] : orders.map((order) => order.id)
    );
  }

  async function restoreOrder(order: WholesaleOrder, askConfirmation = true) {
    if (
      askConfirmation &&
      !window.confirm("هل تريد استرجاع طلب الجملة من الأرشيف؟")
    ) {
      return;
    }

    try {
      setProcessingId(order.id);
      const response = await fetch(
        `/api/admin/wholesale/orders/${order.id}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: false }),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر استرجاع طلب الجملة");
      }

      setOrders((current) => current.filter((item) => item.id !== order.id));
      setSelectedIds((current) => current.filter((id) => id !== order.id));
    } catch (restoreError) {
      console.error("Wholesale archive restore failed", restoreError);
      alert(
        restoreError instanceof Error
          ? restoreError.message
          : "تعذر استرجاع طلب الجملة"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteOrder(order: WholesaleOrder, askConfirmation = true) {
    const label = order.orderNumber || order.id.slice(0, 8);
    if (
      askConfirmation &&
      !window.confirm(
        `هل تريد حذف طلب الجملة ${label} نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`
      )
    ) {
      return;
    }

    try {
      setProcessingId(order.id);
      const response = await fetch(
        `/api/admin/wholesale/orders/${order.id}/hard-delete`,
        { method: "POST" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حذف طلب الجملة نهائيًا");
      }

      setOrders((current) => current.filter((item) => item.id !== order.id));
      setSelectedIds((current) => current.filter((id) => id !== order.id));
    } catch (deleteError) {
      console.error("Wholesale archive delete failed", deleteError);
      alert(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذر حذف طلب الجملة نهائيًا"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function bulkRestore() {
    if (!selectedOrders.length) return;
    if (!window.confirm("هل تريد استرجاع طلبات الجملة المحددة من الأرشيف؟")) {
      return;
    }

    for (const order of selectedOrders) {
      await restoreOrder(order, false);
    }
  }

  async function bulkDelete() {
    if (!selectedOrders.length) return;
    if (
      !window.confirm(
        "هل تريد حذف طلبات الجملة المحددة نهائيًا؟ لا يمكن التراجع عن هذا الإجراء."
      )
    ) {
      return;
    }

    for (const order of selectedOrders) {
      await deleteOrder(order, false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-slate-950">
            <Archive className="h-7 w-7 text-slate-500" />
            أرشيف طلبات الجملة
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            استرجاع الطلبات المؤرشفة أو حذفها نهائيًا عند الحاجة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/wholesale/orders"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            طلبات الجملة
          </Link>
          <button
            type="button"
            onClick={() => loadOrders(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="sticky top-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-sm font-black text-slate-700">
            {selectedIds.length.toLocaleString("ar-EG")} محدد
          </span>
          <button
            type="button"
            onClick={bulkRestore}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:border-emerald-400"
          >
            <ArchiveRestore className="h-4 w-4" />
            استرجاع
          </button>
          <button
            type="button"
            onClick={bulkDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:border-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            حذف نهائي
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : !orders.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Archive className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-black text-slate-900">
            لا توجد طلبات جملة مؤرشفة
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
            <input
              type="checkbox"
              checked={orders.length > 0 && selectedIds.length === orders.length}
              onChange={toggleSelectAll}
              className="h-4 w-4"
            />
            تحديد الكل
          </label>

          {orders.map((order) => (
            <article
              key={order.id}
              className={`grid gap-4 rounded-2xl border p-5 shadow-sm lg:grid-cols-[auto_1fr_auto] ${
                selectedIds.includes(order.id)
                  ? "border-blue-300 bg-blue-50/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(order.id)}
                onChange={() => toggleSelect(order.id)}
                className="mt-2 h-4 w-4"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">
                    {order.orderNumber || `#${order.id.slice(0, 8)}`}
                  </h2>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {customerText(order, "businessName")} -{" "}
                  {customerText(order, "contactName")}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  مؤرشف: {formatDate(order.archivedAt || null)} | إنشاء:{" "}
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-900">
                  {formatMoney(order.subtotal, order.currency)}
                </span>
                <Link
                  href={`/admin/wholesale/orders/${order.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  تفاصيل
                </Link>
                <button
                  type="button"
                  disabled={processingId === order.id}
                  onClick={() => restoreOrder(order)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:border-emerald-400 disabled:opacity-60"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  استرجاع
                </button>
                <button
                  type="button"
                  disabled={processingId === order.id}
                  onClick={() => deleteOrder(order)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:border-rose-400 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف نهائي
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
