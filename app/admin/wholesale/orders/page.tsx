"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  BellRing,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Loader2,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { formatVariantSnapshot } from "@/lib/product-variants";
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

const statusButtonClasses: Record<
  WholesaleOrderStatus,
  { active: string; idle: string }
> = {
  requested: {
    active: "border-slate-700 bg-slate-700 text-white shadow-lg shadow-slate-100",
    idle: "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-300",
  },
  confirmed: {
    active: "border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-100",
    idle: "border-purple-100 bg-purple-50 text-purple-700 hover:border-purple-300",
  },
  preparing: {
    active: "border-amber-600 bg-amber-600 text-white shadow-lg shadow-amber-100",
    idle: "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-300",
  },
  shipped: {
    active: "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100",
    idle: "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-300",
  },
  delivered: {
    active: "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-100",
    idle: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
  },
  canceled: {
    active: "border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-100",
    idle: "border-rose-100 bg-rose-50 text-rose-700 hover:border-rose-300",
  },
};

const statusOptions: Array<WholesaleOrderStatus | "all"> = [
  "all",
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
];

type ArchiveFilter = "active" | "archived" | "all";

const allowedTransitions: Record<WholesaleOrderStatus, WholesaleOrderStatus[]> = {
  requested: ["confirmed", "canceled"],
  confirmed: ["preparing", "canceled"],
  preparing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

function formatMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG")} ${currency}`;
}

function formatDate(value: string) {
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

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return null;
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `2${digits}`;

  return `20${digits}`;
}

function buildWhatsAppMessage(order: WholesaleOrder) {
  const contactName = customerText(order, "contactName");
  const businessName = customerText(order, "businessName");
  const orderNumber = order.orderNumber || order.id;
  const customerLine =
    contactName === "-"
      ? businessName
      : businessName === "-"
        ? contactName
        : `${contactName} - ${businessName}`;

  return [
    `مرحبا ${customerLine === "-" ? "" : customerLine}`,
    "معك فريق Cesar Store لمتابعة طلب الجملة.",
    `رقم الطلب: ${orderNumber}`,
    `حالة الطلب الحالية: ${statusLabels[order.status]}`,
    `إجمالي الطلب: ${formatMoney(order.subtotal, order.currency)}`,
    "برجاء تأكيد تفاصيل الطلب وطريقة الاستلام أو الشحن.",
  ].join("\n");
}

function buildWhatsAppUrl(order: WholesaleOrder) {
  const phone = normalizeWhatsAppNumber(customerText(order, "whatsapp"));
  if (!phone) return null;

  return `https://wa.me/${phone}?text=${encodeURIComponent(
    buildWhatsAppMessage(order)
  )}`;
}

function statusButtonClass(
  currentStatus: WholesaleOrderStatus,
  targetStatus: WholesaleOrderStatus
) {
  const tone =
    currentStatus === targetStatus
      ? statusButtonClasses[targetStatus].active
      : statusButtonClasses[targetStatus].idle;

  return `inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${tone}`;
}

function isUnhandledNewOrder(order: WholesaleOrder) {
  return order.status === "requested";
}

export default function AdminWholesaleOrdersPage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    WholesaleOrderStatus | "all"
  >("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [returningItemId, setReturningItemId] = useState<string | null>(null);
  const [returnForms, setReturnForms] = useState<
    Record<string, { units: string; reason: string; note: string }>
  >({});

  async function loadOrders(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("archived", archiveFilter);
      if (query.trim()) params.set("q", query.trim());
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const response = await fetch(
        `/api/admin/wholesale/orders?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل طلبات الجملة");
      }

      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    } catch (loadError) {
      console.error("Wholesale orders load failed", loadError);
      setError("فشل تحميل طلبات الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    loadOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveFilter, statusFilter]);

  const totals = useMemo(
    () => ({
      count: orders.length,
      newCount: orders.filter(isUnhandledNewOrder).length,
      value: orders.reduce((total, order) => total + order.subtotal, 0),
    }),
    [orders]
  );
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const paginatedOrders = useMemo(
    () => orders.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, orders]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function csvValue(value: unknown) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportOrdersCsv() {
    const rows = [
      [
        "order_number",
        "status",
        "business_name",
        "contact_name",
        "phone",
        "whatsapp",
        "subtotal",
        "items",
        "created_at",
      ],
      ...orders.map((order) => [
        order.orderNumber,
        order.status,
        customerText(order, "businessName"),
        customerText(order, "contactName"),
        customerText(order, "phone"),
        customerText(order, "whatsapp"),
        order.subtotal,
        order.items.length,
        order.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wholesale-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function updateStatus(
    order: WholesaleOrder,
    status: WholesaleOrderStatus
  ) {
    try {
      setUpdatingId(order.id);
      const response = await fetch(`/api/admin/wholesale/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحديث طلب الجملة");
      }

      setOrders((current) =>
        current.map((item) => (item.id === order.id ? payload.order : item))
      );
    } catch (updateError) {
      console.error("Wholesale order status update failed", updateError);
      alert(
        updateError instanceof Error
          ? updateError.message
          : "تعذر تحديث حالة طلب الجملة"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateArchive(order: WholesaleOrder, archived: boolean) {
    const confirmation = archived
      ? "هل تريد أرشفة طلب الجملة؟ سيختفي من عرض الطلبات النشطة."
      : "هل تريد استرجاع طلب الجملة من الأرشيف؟";

    if (!window.confirm(confirmation)) return;

    try {
      setUpdatingId(order.id);
      const response = await fetch(
        `/api/admin/wholesale/orders/${order.id}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived }),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحديث أرشفة طلب الجملة");
      }

      setOrders((current) => {
        if (archiveFilter === "all") {
          return current.map((item) =>
            item.id === order.id ? payload.order : item
          );
        }

        return current.filter((item) => item.id !== order.id);
      });
    } catch (archiveError) {
      console.error("Wholesale order archive update failed", archiveError);
      alert(
        archiveError instanceof Error
          ? archiveError.message
          : "تعذر تحديث أرشفة طلب الجملة"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function updateReturnForm(
    itemId: string,
    field: "units" | "reason" | "note",
    value: string
  ) {
    setReturnForms((current) => ({
      ...current,
      [itemId]: {
        units: current[itemId]?.units || "",
        reason: current[itemId]?.reason || "",
        note: current[itemId]?.note || "",
        [field]: value,
      },
    }));
  }

  async function createReturn(order: WholesaleOrder, itemId: string) {
    const item = order.items.find((currentItem) => currentItem.id === itemId);
    if (!item) return;

    const remainingUnits = Math.max(
      0,
      item.orderedUnits - (item.returnedUnits || 0)
    );
    const form = returnForms[itemId] || { units: "", reason: "", note: "" };
    const returnedUnits = Math.floor(Number(form.units));

    if (order.status !== "delivered") {
      alert("لا يمكن تسجيل مردود إلا بعد تسليم طلب الجملة.");
      return;
    }

    if (!Number.isFinite(returnedUnits) || returnedUnits <= 0) {
      alert("اكتب كمية مردود صحيحة أكبر من صفر.");
      return;
    }

    if (returnedUnits > remainingUnits) {
      alert("كمية المردود أكبر من الكمية المتبقية لهذا الصنف.");
      return;
    }

    try {
      setReturningItemId(itemId);
      const response = await fetch(
        `/api/admin/wholesale/orders/${order.id}/returns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderItemId: itemId,
            returnedUnits,
            reason: form.reason.trim() || "مردود مبيعات",
            note: form.note.trim() || null,
          }),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تسجيل مردود الجملة");
      }

      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder.id === order.id ? payload.order : currentOrder
        )
      );
      setReturnForms((current) => ({
        ...current,
        [itemId]: { units: "", reason: "", note: "" },
      }));
    } catch (returnError) {
      console.error("Wholesale return failed", returnError);
      alert(
        returnError instanceof Error
          ? returnError.message
          : "تعذر تسجيل مردود الجملة"
      );
    } finally {
      setReturningItemId(null);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">طلبات الجملة</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            مراجعة طلبات الشراء بالجملة والتواصل اليدوي مع العملاء.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportOrdersCsv}
            disabled={!orders.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
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

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_170px_170px_170px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadOrders(false);
            }}
            placeholder="بحث برقم الطلب أو اسم العميل أو الهاتف"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as WholesaleOrderStatus | "all")
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none transition focus:border-blue-400 focus:bg-white"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "كل الحالات" : statusLabels[status]}
            </option>
          ))}
        </select>
        <select
          value={archiveFilter}
          onChange={(event) =>
            setArchiveFilter(event.target.value as ArchiveFilter)
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none transition focus:border-blue-400 focus:bg-white"
        >
          <option value="active">الطلبات النشطة</option>
          <option value="archived">الأرشيف</option>
          <option value="all">النشطة والأرشيف</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
        />
        <button
          type="button"
          onClick={() => {
            setCurrentPage(1);
            loadOrders(false);
          }}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
        >
          بحث
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setStatusFilter("requested")}
          className={`rounded-2xl border p-4 text-right transition ${
            totals.newCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          }`}
        >
          <p className="flex items-center gap-2 text-xs font-black">
            <BellRing className="h-4 w-4" />
            طلبات جديدة لم يتم التعامل معها
          </p>
          <p className="mt-2 text-2xl font-black">
            {totals.newCount.toLocaleString("ar-EG")}
          </p>
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black text-slate-400">عدد الطلبات</p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {totals.count.toLocaleString("ar-EG")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black text-slate-400">إجمالي الطلبات المعروضة</p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatMoney(totals.value)}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : !orders.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-black text-slate-900">
            لا توجد طلبات جملة مطابقة
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const whatsappUrl = buildWhatsAppUrl(order);
            const isNewOrder = isUnhandledNewOrder(order);

            return (
            <article
              key={order.id}
              className={`rounded-2xl border p-5 shadow-sm transition ${
                order.archivedAt
                  ? "border-slate-300 bg-slate-50 opacity-90"
                  : isNewOrder
                  ? "border-amber-300 bg-amber-50/70 shadow-amber-100"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-950">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </h2>
                    {isNewOrder ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                        <BellRing className="h-3.5 w-3.5" />
                        طلب جديد لم يتم التعامل معه
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                    {order.archivedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        <Archive className="h-3.5 w-3.5" />
                        مؤرشف
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {customerText(order, "businessName")} -{" "}
                    {customerText(order, "contactName")}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-400">الإجمالي</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700">
                    {formatMoney(order.subtotal, order.currency)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Info label="الهاتف" value={customerText(order, "phone")} />
                <Info label="واتساب" value={customerText(order, "whatsapp")} />
                <Info label="المدينة" value={`${customerText(order, "governorate")} / ${customerText(order, "city")}`} />
                <Info label="تاريخ الطلب" value={formatDate(order.createdAt)} />
              </div>

              {!!order.notes && (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  {order.notes}
                </div>
              )}

              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-xs font-black text-slate-500">
                    <tr>
                      <th className="p-3 text-right">الصنف</th>
                      <th className="p-3 text-right">أقل كمية</th>
                      <th className="p-3 text-right">الكمية المطلوبة</th>
                      <th className="p-3 text-right">سعر القطعة</th>
                      <th className="p-3 text-right">الإجمالي</th>
                      <th className="p-3 text-right">المردود</th>
                      <th className="p-3 text-right">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="p-3 font-black text-slate-900">
                          {item.productNameAr || item.productNameEn}
                          {formatVariantSnapshot(item.variant, "ar") ? (
                            <div className="mt-1 text-xs font-black text-orange-700">
                              {formatVariantSnapshot(item.variant, "ar")}
                            </div>
                          ) : null}
                        </td>
                        <td className="p-3 font-bold text-slate-600">
                          {item.minOrderUnits.toLocaleString("ar-EG")} قطعة
                        </td>
                        <td className="p-3 font-bold text-slate-600">
                          {item.orderedUnits.toLocaleString("ar-EG")} قطعة
                        </td>
                        <td className="p-3 font-bold text-slate-600">
                          {formatMoney(item.unitPrice, order.currency)}
                        </td>
                        <td className="p-3 font-black text-slate-900">
                          {formatMoney(item.lineTotal, order.currency)}
                        </td>
                        <td className="p-3 font-bold text-rose-600">
                          {(item.returnedUnits || 0).toLocaleString("ar-EG")} قطعة
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          {Math.max(
                            0,
                            item.orderedUnits - (item.returnedUnits || 0)
                          ).toLocaleString("ar-EG")}{" "}
                          قطعة
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {order.status === "delivered" ? (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-emerald-900">
                        مردودات مبيعات الجملة
                      </h3>
                      <p className="mt-1 text-xs font-bold text-emerald-700">
                        تسجيل مردود يزيد مخزون الصنف بنفس الكمية ويمنع رد كمية أكبر من الطلب.
                      </p>
                    </div>
                    <RotateCcw className="h-5 w-5 text-emerald-700" />
                  </div>

                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => {
                      const remainingUnits = Math.max(
                        0,
                        item.orderedUnits - (item.returnedUnits || 0)
                      );
                      const form = returnForms[item.id] || {
                        units: "",
                        reason: "",
                        note: "",
                      };

                      return (
                        <div
                          key={`${item.id}-return`}
                          className="grid gap-3 rounded-xl border border-emerald-100 bg-white p-3 md:grid-cols-[1.4fr_110px_1fr_1fr_auto]"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              {item.productNameAr || item.productNameEn}
                            </p>
                            {formatVariantSnapshot(item.variant, "ar") ? (
                              <p className="mt-1 text-xs font-black text-orange-700">
                                {formatVariantSnapshot(item.variant, "ar")}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              المرتجع: {(item.returnedUnits || 0).toLocaleString("ar-EG")} / المتبقي: {remainingUnits.toLocaleString("ar-EG")} قطعة
                            </p>
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={remainingUnits}
                            value={form.units}
                            disabled={remainingUnits <= 0 || returningItemId === item.id}
                            onChange={(event) =>
                              updateReturnForm(item.id, "units", event.target.value)
                            }
                            placeholder="الكمية"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black outline-none transition focus:border-emerald-400 focus:bg-white disabled:opacity-60"
                          />
                          <input
                            value={form.reason}
                            disabled={remainingUnits <= 0 || returningItemId === item.id}
                            onChange={(event) =>
                              updateReturnForm(item.id, "reason", event.target.value)
                            }
                            placeholder="سبب المردود"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none transition focus:border-emerald-400 focus:bg-white disabled:opacity-60"
                          />
                          <input
                            value={form.note}
                            disabled={remainingUnits <= 0 || returningItemId === item.id}
                            onChange={(event) =>
                              updateReturnForm(item.id, "note", event.target.value)
                            }
                            placeholder="ملاحظة اختيارية"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none transition focus:border-emerald-400 focus:bg-white disabled:opacity-60"
                          />
                          <button
                            type="button"
                            disabled={remainingUnits <= 0 || returningItemId === item.id}
                            onClick={() => createReturn(order, item.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {returningItemId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            تسجيل مردود
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {order.returns.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-3">
                      <p className="text-xs font-black text-slate-500">
                        سجل المردودات
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.returns.map((itemReturn) => (
                          <span
                            key={itemReturn.id}
                            className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800"
                          >
                            {itemReturn.returnNumber || itemReturn.id.slice(0, 8)}: {itemReturn.returnedUnits.toLocaleString("ar-EG")} قطعة
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {(statusOptions.filter(
                    (status): status is WholesaleOrderStatus => status !== "all"
                  )).map((status) => {
                    const canMoveToStatus = allowedTransitions[order.status].includes(status);
                    const isCurrentStatus = status === order.status;

                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={
                          updatingId === order.id ||
                          Boolean(order.archivedAt) ||
                          isCurrentStatus ||
                          !canMoveToStatus
                        }
                        title={
                          isCurrentStatus
                            ? "هذه هي الحالة الحالية"
                            : canMoveToStatus
                              ? "تغيير حالة الطلب"
                              : "انتقال غير مسموح من الحالة الحالية"
                        }
                        onClick={() => updateStatus(order, status)}
                        className={statusButtonClass(order.status, status)}
                      >
                        {status === "delivered" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : status === "canceled" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                        {statusLabels[status]}
                      </button>
                    );
                  })}
                </div>

                <Link
                  href={`/admin/wholesale/orders/${order.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  تفاصيل الطلب
                </Link>

                <button
                  type="button"
                  disabled={updatingId === order.id}
                  onClick={() => updateArchive(order, !order.archivedAt)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
                >
                  {order.archivedAt ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {order.archivedAt ? "استرجاع من الأرشيف" : "أرشفة"}
                </button>

                <a
                  href={`/api/admin/wholesale/orders/${order.id}/report`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 transition hover:border-blue-400"
                >
                  <FileText className="h-4 w-4" />
                  تقرير الطلب
                </a>

                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 transition hover:border-emerald-400"
                  >
                    <Phone className="h-4 w-4" />
                    متابعة واتساب برسالة جاهزة
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
                    <Phone className="h-4 w-4" />
                    رقم واتساب غير متاح
                  </span>
                )}
              </div>
            </article>
            );
          })}
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-500">
                صفحة {currentPage.toLocaleString("ar-EG")} من{" "}
                {totalPages.toLocaleString("ar-EG")} - إجمالي{" "}
                {orders.length.toLocaleString("ar-EG")} طلب
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-blue-300 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-blue-300 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
