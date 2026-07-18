"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  createVariantSnapshot,
  formatVariantSnapshot,
} from "@/lib/product-variants";
import type {
  WholesaleOrder,
  WholesaleOrderStatus,
  WholesaleProductSettingProduct,
} from "@/types/wholesale";

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

const statusOptions: WholesaleOrderStatus[] = [
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
];

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

function buildWhatsAppUrl(order: WholesaleOrder) {
  const phone = normalizeWhatsAppNumber(customerText(order, "whatsapp"));
  if (!phone) return null;

  const message = [
    `مرحبًا ${customerText(order, "contactName")}`,
    "معك فريق Cesar Store لمتابعة طلب الجملة.",
    `رقم الطلب: ${order.orderNumber || order.id}`,
    `حالة الطلب الحالية: ${statusLabels[order.status]}`,
    `إجمالي الطلب: ${formatMoney(order.subtotal, order.currency)}`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function isWholesaleProductReady(product: WholesaleProductSettingProduct) {
  const enabled = product.setting?.isEnabled ?? true;
  const price = Number(product.setting?.wholesalePrice || 0);
  return product.active && product.stock > 0 && enabled && price > 0;
}

function getActiveVariants(product: WholesaleProductSettingProduct | null) {
  if (!product?.variantOptions?.length || !product.variants?.length) return [];

  return product.variants.filter((variant) => variant.active !== false);
}

export default function AdminWholesaleOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const [order, setOrder] = useState<WholesaleOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<WholesaleProductSettingProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addVariantKey, setAddVariantKey] = useState("");
  const [addUnits, setAddUnits] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  async function loadOrder(initial = false) {
    if (!orderId) return;
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/wholesale/orders/${orderId}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل طلب الجملة");
      }

      setOrder(payload.order);
    } catch (loadError) {
      console.error("Wholesale order details load failed", loadError);
      setError("فشل تحميل تفاصيل طلب الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadProducts() {
    try {
      setProductsLoading(true);
      const response = await fetch("/api/admin/wholesale/product-settings");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل منتجات الجملة");
      }

      const nextProducts = Array.isArray(payload?.products)
        ? payload.products.filter(isWholesaleProductReady)
        : [];
      setProducts(nextProducts);
      setAddProductId((current) => current || nextProducts[0]?.id || "");
    } catch (productError) {
      console.error("Wholesale add-item products load failed", productError);
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    loadOrder(true);
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function updateStatus(status: WholesaleOrderStatus) {
    if (!order) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/wholesale/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحديث طلب الجملة");
      }

      setOrder(payload.order);
    } catch (updateError) {
      console.error("Wholesale order details status update failed", updateError);
      alert(
        updateError instanceof Error
          ? updateError.message
          : "تعذر تحديث حالة طلب الجملة"
      );
    } finally {
      setUpdating(false);
    }
  }

  const whatsappUrl = order ? buildWhatsAppUrl(order) : null;
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === addProductId) || null,
    [addProductId, products]
  );
  const activeVariants = useMemo(
    () => getActiveVariants(selectedProduct),
    [selectedProduct]
  );
  const selectedVariant = activeVariants.find(
    (variant) => variant.key === addVariantKey
  );
  const selectedVariantSnapshot =
    selectedProduct && selectedVariant
      ? createVariantSnapshot(
          selectedProduct.variantOptions || [],
          selectedVariant.selections
        )
      : null;
  const selectedVariantLabel =
    selectedVariantSnapshot?.label_ar ||
    selectedVariantSnapshot?.label_en ||
    selectedVariant?.key ||
    "";

  async function updateArchive(archived: boolean) {
    if (!order) return;

    const confirmation = archived
      ? "هل تريد أرشفة طلب الجملة؟ سيختفي من عرض الطلبات النشطة."
      : "هل تريد استرجاع طلب الجملة من الأرشيف؟";

    if (!window.confirm(confirmation)) return;

    try {
      setUpdating(true);
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

      setOrder(payload.order);
    } catch (archiveError) {
      console.error("Wholesale order details archive update failed", archiveError);
      alert(
        archiveError instanceof Error
          ? archiveError.message
          : "تعذر تحديث أرشفة طلب الجملة"
      );
    } finally {
      setUpdating(false);
    }
  }

  async function addItemToOrder() {
    if (!order || !selectedProduct) return;

    const orderedUnits = Math.floor(Number(addUnits));

    if (order.status !== "preparing" || order.archivedAt) {
      alert("إضافة صنف متاحة فقط لطلب جملة نشط في حالة التحضير.");
      return;
    }

    if (!Number.isFinite(orderedUnits) || orderedUnits <= 0) {
      alert("اكتب كمية صحيحة أكبر من صفر.");
      return;
    }

    if (activeVariants.length && !addVariantKey) {
      alert("اختر نوع/متغير المنتج قبل الإضافة.");
      return;
    }

    try {
      setAddingItem(true);
      const response = await fetch(`/api/admin/wholesale/orders/${order.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          variantKey: addVariantKey,
          variantSnapshot: selectedVariantSnapshot,
          orderedUnits,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر إضافة الصنف إلى طلب الجملة");
      }

      setOrder(payload.order);
      setAddUnits("");
      setAddVariantKey("");
      await loadProducts();
    } catch (addError) {
      console.error("Wholesale order add item failed", addError);
      alert(
        addError instanceof Error
          ? addError.message
          : "تعذر إضافة الصنف إلى طلب الجملة"
      );
    } finally {
      setAddingItem(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/wholesale/orders"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع لطلبات الجملة
          </Link>
          <h1 className="mt-3 text-3xl font-black text-slate-950">
            تفاصيل طلب الجملة
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {order ? (
            <button
              type="button"
              onClick={() => updateArchive(!order.archivedAt)}
              disabled={updating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
            >
              {order.archivedAt ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {order.archivedAt ? "استرجاع من الأرشيف" : "أرشفة"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => loadOrder(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : order ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-950">
                    {order.orderNumber || order.id}
                  </h2>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                  {order.archivedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                      <Archive className="h-3.5 w-3.5" />
                      مؤرشف
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {formatDate(order.createdAt)}
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
              <Info label="النشاط" value={customerText(order, "businessName")} />
              <Info label="المسؤول" value={customerText(order, "contactName")} />
              <Info label="الهاتف" value={customerText(order, "phone")} />
              <Info label="واتساب" value={customerText(order, "whatsapp")} />
              <Info label="المحافظة" value={customerText(order, "governorate")} />
              <Info label="المدينة" value={customerText(order, "city")} />
              <Info label="البريد" value={customerText(order, "email")} />
              <Info label="حساب الجملة" value={order.wholesaleCustomerId} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">تحديث الحالة</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {statusOptions.map((status) => {
                const isCurrent = status === order.status;
                const canMove = allowedTransitions[order.status].includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={updating || Boolean(order.archivedAt) || isCurrent || !canMove}
                    onClick={() => updateStatus(status)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
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
          </section>

          {order.status === "preparing" && !order.archivedAt ? (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-blue-950">
                    إضافة صنف على طلب قائم
                  </h2>
                  <p className="mt-1 text-sm font-bold text-blue-700">
                    متاح فقط أثناء التحضير. الإضافة تخصم المخزون وتحدث إجمالي طلب الجملة ذريًا.
                  </p>
                </div>
                <Plus className="h-5 w-5 text-blue-700" />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.7fr)_150px_auto]">
                <select
                  value={addProductId}
                  disabled={productsLoading || addingItem || !products.length}
                  onChange={(event) => {
                    setAddProductId(event.target.value);
                    setAddVariantKey("");
                  }}
                  className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-400 disabled:opacity-60"
                >
                  {products.length ? (
                    products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name.ar || product.name.en} -{" "}
                        {formatMoney(product.setting?.wholesalePrice || 0)}
                      </option>
                    ))
                  ) : (
                    <option value="">لا توجد منتجات جملة جاهزة</option>
                  )}
                </select>

                {activeVariants.length ? (
                  <select
                    value={addVariantKey}
                    disabled={addingItem}
                    onChange={(event) => setAddVariantKey(event.target.value)}
                    className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-400 disabled:opacity-60"
                  >
                    <option value="">اختر النوع</option>
                    {activeVariants.map((variant) => {
                      const snapshot = createVariantSnapshot(
                        selectedProduct?.variantOptions || [],
                        variant.selections
                      );
                      const label =
                        snapshot.label_ar || snapshot.label_en || variant.key;
                      const stock =
                        typeof variant.stock === "number"
                          ? Math.max(0, Math.floor(variant.stock))
                          : selectedProduct?.stock || 0;

                      return (
                        <option key={variant.key} value={variant.key}>
                          {label} - متاح {stock.toLocaleString("ar-EG")}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-500">
                    بدون متغيرات
                  </div>
                )}

                <input
                  type="number"
                  min={1}
                  value={addUnits}
                  disabled={addingItem || !selectedProduct}
                  onChange={(event) => setAddUnits(event.target.value)}
                  placeholder="الكمية"
                  className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-400 disabled:opacity-60"
                />

                <button
                  type="button"
                  disabled={addingItem || !selectedProduct || productsLoading}
                  onClick={addItemToOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60"
                >
                  {addingItem ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  إضافة
                </button>
              </div>

              {selectedProduct ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-blue-800">
                  <span className="rounded-full bg-white px-3 py-1">
                    الحد الأدنى:{" "}
                    {(selectedProduct.setting?.minOrderUnits || 1).toLocaleString(
                      "ar-EG"
                    )}{" "}
                    قطعة
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    المخزون: {selectedProduct.stock.toLocaleString("ar-EG")} قطعة
                  </span>
                  {selectedVariantLabel ? (
                    <span className="rounded-full bg-white px-3 py-1">
                      النوع: {selectedVariantLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="p-3 text-right">الصنف</th>
                  <th className="p-3 text-right">الحد الأدنى</th>
                  <th className="p-3 text-right">الكمية</th>
                  <th className="p-3 text-right">سعر القطعة</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">المردود</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-3 font-black text-slate-950">
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
                    <td className="p-3 font-black text-slate-950">
                      {formatMoney(item.lineTotal, order.currency)}
                    </td>
                    <td className="p-3 font-bold text-rose-700">
                      {(item.returnedUnits || 0).toLocaleString("ar-EG")} قطعة
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {order.returns.length ? (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <h2 className="text-lg font-black text-emerald-950">
                سجل مردودات الطلب
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {order.returns.map((itemReturn) => (
                  <span
                    key={itemReturn.id}
                    className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-black text-emerald-800"
                  >
                    {itemReturn.returnNumber || itemReturn.id.slice(0, 8)}:{" "}
                    {itemReturn.returnedUnits.toLocaleString("ar-EG")} قطعة
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/admin/wholesale/orders/${order.id}/report`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:border-blue-400"
            >
              <FileText className="h-4 w-4" />
              تقرير طباعة
            </a>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:border-emerald-400"
              >
                <Phone className="h-4 w-4" />
                متابعة واتساب
              </a>
            ) : null}
          </div>
        </>
      ) : null}
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
