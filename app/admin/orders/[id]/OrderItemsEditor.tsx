"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createVariantSnapshot,
  formatVariantSnapshot,
} from "@/lib/product-variants";
import { formatOrderMoney } from "@/lib/order-pricing";
import type {
  ProductVariant,
  ProductVariantOption,
  ProductVariantSnapshot,
} from "@/types/product";

export type EditableOrderItem = {
  product_id?: string | null;
  name: string;
  name_ar?: string;
  name_en?: string;
  price: number;
  quantity: number;
  image?: string | null;
  variant_key?: string;
  variant?: ProductVariantSnapshot | null;
};

type CatalogProduct = {
  id: string;
  name: { ar: string; en: string };
  price: number;
  image?: string | null;
  stock: number;
  active: boolean;
  variantOptions: ProductVariantOption[];
  variants: ProductVariant[];
};

type DraftItem = EditableOrderItem & {
  product_id: string;
  variant_key: string;
};

type Props = {
  orderId: string;
  currency: string;
  expectedVersion: number;
  items: EditableOrderItem[];
  locked: boolean;
  onSaved: () => Promise<void>;
};

function itemKey(productId: string, variantKey = "") {
  return `${productId}::${variantKey}`;
}

function normalizeDraft(items: EditableOrderItem[]): DraftItem[] {
  return items
    .filter((item): item is EditableOrderItem & { product_id: string } =>
      Boolean(item.product_id)
    )
    .map((item) => ({
      ...item,
      product_id: item.product_id,
      variant_key: item.variant_key || item.variant?.key || "",
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      price: Number(item.price || 0),
    }));
}

function signature(items: DraftItem[]) {
  return JSON.stringify(
    items.map((item) => ({
      productId: item.product_id,
      variantKey: item.variant_key,
      quantity: item.quantity,
    }))
  );
}

function variantLabel(product: CatalogProduct, variant: ProductVariant) {
  return createVariantSnapshot(
    product.variantOptions,
    variant.selections
  ).label_ar || variant.key;
}

function variantPrice(product: CatalogProduct, variant?: ProductVariant | null) {
  return typeof variant?.price === "number" && variant.price > 0
    ? variant.price
    : product.price;
}

function variantStock(product: CatalogProduct, variant?: ProductVariant | null) {
  return typeof variant?.stock === "number" && Number.isFinite(variant.stock)
    ? Math.max(0, Math.floor(variant.stock))
    : product.stock;
}

export default function OrderItemsEditor({
  orderId,
  currency,
  expectedVersion,
  items,
  locked,
  onSaved,
}: Props) {
  const [draftItems, setDraftItems] = useState<DraftItem[]>(() =>
    normalizeDraft(items)
  );
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState<string | null>(null);

  const hasLegacyItem = items.some((item) => !item.product_id);
  const initialSignature = useMemo(() => signature(normalizeDraft(items)), [items]);
  const currentSignature = useMemo(() => signature(draftItems), [draftItems]);
  const dirty = initialSignature !== currentSignature;
  const draftSubtotal = draftItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    if (!catalog || !query) return catalog || [];

    return catalog.filter((product) =>
      `${product.name.ar} ${product.name.en}`
        .toLocaleLowerCase("ar")
        .includes(query)
    );
  }, [catalog, search]);

  async function openCatalog() {
    setCatalogOpen(true);
    setMessage(null);
    if (catalog || catalogLoading) return;

    try {
      setCatalogLoading(true);
      const response = await fetch("/api/admin/orders/catalog", {
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "تعذر تحميل قائمة المنتجات");
      }
      setCatalog(Array.isArray(result?.products) ? result.products : []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر تحميل قائمة المنتجات"
      );
    } finally {
      setCatalogLoading(false);
    }
  }

  function updateQuantity(key: string, quantity: number) {
    const safeQuantity = Math.max(1, Math.min(9999, Math.floor(quantity || 1)));
    setDraftItems((current) =>
      current.map((item) =>
        itemKey(item.product_id, item.variant_key) === key
          ? { ...item, quantity: safeQuantity }
          : item
      )
    );
    setMessage(null);
  }

  function removeItem(key: string) {
    setDraftItems((current) =>
      current.filter(
        (item) => itemKey(item.product_id, item.variant_key) !== key
      )
    );
    setMessage(null);
  }

  function addProduct(product: CatalogProduct) {
    const selectedVariantKey = selectedVariants[product.id] || "";
    const selectedVariant = product.variants.find(
      (variant) => variant.key === selectedVariantKey
    );

    if (product.variants.length > 0 && !selectedVariant) {
      setMessage("اختر النوع أو المقاس المطلوب قبل إضافة الصنف");
      return;
    }

    const availableStock = variantStock(product, selectedVariant);
    if (
      !product.active ||
      selectedVariant?.active === false ||
      availableStock <= 0
    ) {
      setMessage("هذا الصنف أو الاختيار غير متاح حاليًا في المخزون");
      return;
    }

    const key = itemKey(product.id, selectedVariant?.key || "");
    const variantSnapshot = selectedVariant
      ? createVariantSnapshot(product.variantOptions, selectedVariant.selections)
      : null;

    setDraftItems((current) => {
      const existing = current.find(
        (item) => itemKey(item.product_id, item.variant_key) === key
      );
      if (existing) {
        return current.map((item) =>
          itemKey(item.product_id, item.variant_key) === key
            ? { ...item, quantity: Math.min(9999, item.quantity + 1) }
            : item
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          variant_key: selectedVariant?.key || "",
          name: product.name.ar || product.name.en,
          name_ar: product.name.ar,
          name_en: product.name.en,
          price: variantPrice(product, selectedVariant),
          quantity: 1,
          image: product.image || null,
          variant: variantSnapshot,
        },
      ];
    });
    setMessage(null);
  }

  async function saveItems() {
    if (saving || locked || hasLegacyItem || !dirty) return;
    if (draftItems.length === 0) {
      setMessage("يجب أن يحتوي الطلب على صنف واحد على الأقل");
      return;
    }

    if (
      !window.confirm(
        "سيتم تحديث أصناف الطلب والمخزون والفاتورة والإجماليات. هل تريد الحفظ؟"
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch(`/api/admin/orders/${orderId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion,
          items: draftItems.map((item) => ({
            productId: item.product_id,
            variantKey: item.variant_key,
            quantity: item.quantity,
          })),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "تعذر حفظ أصناف الطلب");
      }

      await onSaved();
      setMessage("تم تحديث الأصناف والمخزون والفاتورة وإجماليات الطلب");
      setCatalogOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ أصناف الطلب");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-7 text-slate-900">
            تفاصيل أصناف الطلب
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            أي حفظ هنا يحدّث المخزون والفواتير والتقارير تلقائيًا.
          </p>
        </div>
        <button
          type="button"
          onClick={openCatalog}
          disabled={locked || saving || hasLegacyItem}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PackagePlus size={17} />
          إضافة صنف
        </button>
      </div>

      {locked ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          تم قفل تعديل الأصناف لأن الطلب أصبح مشحونًا أو مغلقًا.
        </div>
      ) : null}

      {hasLegacyItem ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          يحتوي هذا الطلب على صنف تاريخي بلا معرّف منتج، لذلك تم منع التعديل لحماية المخزون. يمكن عرض الطلب وطباعته كالمعتاد.
        </div>
      ) : null}

      <div className="space-y-4">
        {draftItems.map((item) => {
          const key = itemKey(item.product_id, item.variant_key);
          return (
            <div
              key={key}
              className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
            >
              <div className="min-w-0">
                <p className="break-words text-base font-black leading-7 text-slate-900">
                  {item.name}
                </p>
                {formatVariantSnapshot(item.variant, "ar") ? (
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                    {formatVariantSnapshot(item.variant, "ar")}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                  سعر الوحدة: {formatOrderMoney(item.price, currency)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-slate-500">الكمية</p>
                <div
                  className="flex items-center gap-2"
                  aria-label={`كمية ${item.name}`}
                >
                  <button
                    type="button"
                    onClick={() => updateQuantity(key, item.quantity - 1)}
                    disabled={locked || saving || item.quantity <= 1}
                    aria-label={`تقليل كمية ${item.name}`}
                    title="تقليل الكمية"
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    inputMode="numeric"
                    value={item.quantity}
                    disabled={locked || saving}
                    onChange={(event) =>
                      updateQuantity(key, Number(event.target.value))
                    }
                    aria-label={`الكمية المطلوبة من ${item.name}`}
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center font-black"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(key, item.quantity + 1)}
                    disabled={locked || saving || item.quantity >= 9999}
                    aria-label={`زيادة كمية ${item.name}`}
                    title="زيادة الكمية"
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 lg:flex-col lg:items-end">
                <div>
                  <p className="text-xs font-black text-slate-500">إجمالي الصنف</p>
                  <p className="mt-1 whitespace-nowrap text-base font-black text-slate-900">
                    {formatOrderMoney(item.price * item.quantity, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(key)}
                  disabled={locked || saving}
                  aria-label={`حذف ${item.name} من الطلب`}
                  title="حذف الصنف من الطلب"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-black text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  حذف الصنف
                </button>
              </div>
            </div>
          );
        })}

        {draftItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm font-bold text-slate-400">
            أضف صنفًا واحدًا على الأقل قبل الحفظ
          </div>
        ) : null}
      </div>

      {catalogOpen ? (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-4 flex items-center gap-3">
            <label className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <span className="sr-only">البحث عن منتج</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم المنتج..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pe-10 ps-4 text-sm font-bold"
              />
            </label>
            <button
              type="button"
              onClick={() => setCatalogOpen(false)}
              aria-label="إغلاق قائمة المنتجات"
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600"
            >
              <X size={17} />
            </button>
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-blue-700">
              <Loader2 size={18} className="animate-spin" />
              جاري تحميل المنتجات...
            </div>
          ) : (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto pe-1">
              {filteredCatalog.map((product) => {
                const selectedVariant = product.variants.find(
                  (variant) => variant.key === selectedVariants[product.id]
                );
                const availableStock = variantStock(product, selectedVariant);
                const canAdd =
                  product.active &&
                  (product.variants.length === 0 || Boolean(selectedVariant)) &&
                  selectedVariant?.active !== false &&
                  availableStock > 0;

                return (
                  <div
                    key={product.id}
                    className="grid gap-3 rounded-xl border border-slate-100 bg-white p-4 md:grid-cols-[1fr_minmax(10rem,auto)_auto] md:items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {product.name.ar || product.name.en}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatOrderMoney(
                          variantPrice(product, selectedVariant),
                          currency
                        )}
                        {product.variants.length === 0
                          ? ` · المتاح ${product.stock}`
                          : selectedVariant
                          ? ` · المتاح ${availableStock}`
                          : ""}
                      </p>
                    </div>

                    {product.variants.length > 0 ? (
                      <label>
                        <span className="sr-only">اختيار مواصفة المنتج</span>
                        <select
                          value={selectedVariants[product.id] || ""}
                          onChange={(event) =>
                            setSelectedVariants((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                        >
                          <option value="">اختر النوع</option>
                          {product.variants.map((variant) => (
                            <option
                              key={variant.key}
                              value={variant.key}
                              disabled={
                                variant.active === false ||
                                variantStock(product, variant) <= 0
                              }
                            >
                              {variantLabel(product, variant)} — متاح {variantStock(product, variant)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        بدون اختيارات
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={!canAdd || saving}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus size={15} /> إضافة
                    </button>
                  </div>
                );
              })}

              {!catalogLoading && filteredCatalog.length === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-slate-400">
                  لا توجد منتجات مطابقة
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <div>
          <p className="text-xs text-slate-400">مجموع المنتجات بعد الحفظ</p>
          <p className="text-lg font-black text-blue-700">
            {formatOrderMoney(draftSubtotal, currency)}
          </p>
          {message ? (
            <p
              className={`mt-2 text-sm font-bold ${
                message.startsWith("تم ") ? "text-emerald-600" : "text-rose-600"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={saveItems}
          disabled={
            locked || saving || hasLegacyItem || !dirty || draftItems.length === 0
          }
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          {saving ? "جاري الحفظ..." : "حفظ أصناف الطلب"}
        </button>
      </div>
    </div>
  );
}
