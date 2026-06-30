"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eraser,
  Loader2,
  MessageCircle,
  Minus,
  PackageSearch,
  Plus,
  Send,
  ShieldAlert,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useWholesaleCart } from "@/context/WholesaleDbCartContext";
import { formatVariantSnapshot } from "@/lib/product-variants";
import { WHOLESALE_WHATSAPP_URL } from "@/lib/seo";
import type {
  WholesaleCartItem,
  WholesaleCatalogAccess,
  WholesaleCatalogProduct,
  WholesaleOrder,
} from "@/types/wholesale";

type CatalogResponse = {
  products: WholesaleCatalogProduct[];
  access: WholesaleCatalogAccess;
};

type DisplayItem = WholesaleCartItem & {
  cartKey: string;
  product: WholesaleCatalogProduct;
  variantLabel: string;
  hasVariants: boolean;
  lineTotal: number;
  quantityInput: string;
  parsedUnits: number | null;
  minimumUnits: number;
  maximumUnits: number;
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ar-EG").format(value)} ج.م`;
}

function parseQuantityInput(value: string) {
  const normalizedValue = value
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    )
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/[^\d]/g, "");

  if (!normalizedValue) return null;

  const quantity = Number.parseInt(normalizedValue, 10);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function getCartItemKey(item: Pick<WholesaleCartItem, "productId" | "variantKey">) {
  return `${item.productId}::${item.variantKey || ""}`;
}

function createOrderToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function customerSnapshotText(order: WholesaleOrder, field: string) {
  const value = order.customerSnapshot?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function buildWholesaleWhatsAppMessage(order: WholesaleOrder) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customerSnapshotText(order, "contactName");
  const businessName = customerSnapshotText(order, "businessName");
  const customerPhone = customerSnapshotText(order, "phone");
  const customerWhatsApp = customerSnapshotText(order, "whatsapp");
  const city = customerSnapshotText(order, "city");
  const governorate = customerSnapshotText(order, "governorate");
  const address = customerSnapshotText(order, "address");
  const itemsText = order.items
    .map((item, index) => {
      const productName = item.productNameAr || item.productNameEn || "منتج";
      const variantLabel = formatVariantSnapshot(item.variant, "ar");
      const variantText = variantLabel ? ` - ${variantLabel}` : "";

      return `${index + 1}. ${productName}${variantText}
   الكمية: ${new Intl.NumberFormat("ar-EG").format(item.orderedUnits)} قطعة
   سعر القطعة: ${formatPrice(item.unitPrice)}
   الإجمالي: ${formatPrice(item.lineTotal)}`;
    })
    .join("\n\n");
  const notesText = order.notes?.trim()
    ? `\nملاحظات العميل:\n${order.notes.trim()}`
    : "";

  return `طلب جملة جديد من Cesar Store

رقم الطلب: ${orderNumber}
اسم الكيان: ${businessName}
المسؤول: ${customerName}
الهاتف: ${customerPhone}
واتساب: ${customerWhatsApp}
المحافظة/المدينة: ${governorate} / ${city}
العنوان: ${address}

الأصناف:
${itemsText}

إجمالي الطلب: ${formatPrice(order.subtotal)}${notesText}`;
}

function buildWholesaleWhatsAppUrl(order: WholesaleOrder) {
  return `${WHOLESALE_WHATSAPP_URL}?text=${encodeURIComponent(
    buildWholesaleWhatsAppMessage(order)
  )}`;
}

export default function WholesaleOrderPage() {
  const [products, setProducts] = useState<WholesaleCatalogProduct[]>([]);
  const [access, setAccess] = useState<WholesaleCatalogAccess | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<WholesaleOrder | null>(null);
  const [createdOrderWhatsAppUrl, setCreatedOrderWhatsAppUrl] = useState<string | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [quantityWarning, setQuantityWarning] = useState<string | null>(null);
  const quantityWarningTimerRef = useRef<number | null>(null);
  const {
    items: cartItems,
    updateItem: updateWholesaleCartItem,
    removeItem: removeWholesaleCartItem,
    replaceItems: replaceWholesaleCartItems,
    clearCart: clearWholesaleCart,
    resetCartView,
  } = useWholesaleCart();

  useEffect(() => {
    setQuantityInputs((current) => {
      const next: Record<string, string> = {};

      for (const item of cartItems) {
        const cartKey = getCartItemKey(item);
        next[cartKey] = current[cartKey] ?? String(item.orderedUnits);
      }

      return next;
    });
  }, [cartItems]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/wholesale/catalog", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | CatalogResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && "error" in payload && payload.error
              ? payload.error
              : "تعذر تحميل بيانات طلب الجملة"
          );
        }

        const catalog = payload as CatalogResponse;
        setProducts(Array.isArray(catalog.products) ? catalog.products : []);
        setAccess(catalog.access);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل بيانات طلب الجملة"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!access?.canViewPrices || loading || products.length === 0) return;

    const availableProductIds = new Set(
      products
        .filter(
          (product) =>
            product.priceVisible &&
            product.wholesalePrice !== null &&
            product.wholesalePrice > 0 &&
            product.stock > 0
        )
        .map((product) => product.id)
    );

    const nextItems = cartItems.filter((item) =>
      availableProductIds.has(item.productId)
    );

    if (nextItems.length !== cartItems.length) {
      replaceWholesaleCartItems(nextItems);
    }
  }, [
    access?.canViewPrices,
    cartItems,
    loading,
    products,
    replaceWholesaleCartItems,
  ]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));

    return cartItems.flatMap((item) => {
      const product = productsById.get(item.productId);

      if (!product || !product.priceVisible || !product.wholesalePrice) {
        return [];
      }

      const cartKey = getCartItemKey(item);
      const variantKey = item.variantKey || "";
      const hasVariants = Boolean(product.variantOptions?.length && product.variants?.length);
      const matchedVariant = hasVariants
        ? product.variants?.find(
            (variant) => variant.key === variantKey && variant.active !== false
          ) || null
        : null;
      const minimumUnits = Math.max(1, product.minOrderUnits || 1);
      const maximumUnits =
        hasVariants && matchedVariant && typeof matchedVariant.stock === "number"
          ? Math.max(0, Math.floor(matchedVariant.stock))
          : Math.max(0, product.stock || 0);
      const quantityInput = quantityInputs[cartKey] ?? String(item.orderedUnits);
      const parsedUnits = parseQuantityInput(quantityInput);
      const orderedUnits = parsedUnits ?? 0;

      return [
        {
          ...item,
          cartKey,
          orderedUnits,
          quantityInput,
          parsedUnits,
          minimumUnits,
          maximumUnits,
          product,
          variantLabel: formatVariantSnapshot(item.variant, "ar"),
          hasVariants,
          lineTotal: orderedUnits * product.wholesalePrice,
        },
      ];
    });
  }, [cartItems, products, quantityInputs]);

  const subtotal = displayItems.reduce((total, item) => total + item.lineTotal, 0);
  const orderedUnitsByProductId = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of displayItems) {
      totals.set(item.productId, (totals.get(item.productId) || 0) + item.orderedUnits);
    }
    return totals;
  }, [displayItems]);
  const isDisplayItemInvalid = useCallback(
    (item: DisplayItem) =>
      item.parsedUnits === null ||
      (item.hasVariants
        ? (orderedUnitsByProductId.get(item.productId) || 0) < item.minimumUnits
        : item.orderedUnits < item.minimumUnits) ||
      item.orderedUnits > item.maximumUnits,
    [orderedUnitsByProductId]
  );
  const invalidQuantityItems = useMemo(() => {
    return displayItems.filter((item) => isDisplayItemInvalid(item));
  }, [displayItems, isDisplayItemInvalid]);
  const canSubmit = Boolean(
    access?.canViewPrices && displayItems.length > 0 && invalidQuantityItems.length === 0
  );

  const buildQuantityIssueMessage = useCallback((item: DisplayItem) => {
    const productName = item.product.name.ar || item.product.name.en || "هذا المنتج";
    if (item.parsedUnits !== null && item.orderedUnits > item.maximumUnits) {
      return `الكمية المتاحة حاليا من المنتج "${productName}" هي ${new Intl.NumberFormat(
        "ar-EG"
      ).format(item.maximumUnits)} قطعة فقط. عدل الكمية حتى يمكن إرسال طلب الجملة.`;
    }

    return `أقل كمية شراء للمنتج "${productName}" هي ${new Intl.NumberFormat(
      "ar-EG"
    ).format(item.minimumUnits)} قطعة. عدل الكمية إلى الحد الأدنى أو أكثر حتى يمكنك إرسال طلب الجملة.`;
  }, []);

  useEffect(() => {
    return () => {
      if (quantityWarningTimerRef.current !== null) {
        window.clearTimeout(quantityWarningTimerRef.current);
      }
    };
  }, []);

  function updateUnits(productId: string, rawValue: string, variantKey = "") {
    const cleanedValue = rawValue.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, "");
    const cartKey = `${productId}::${variantKey}`;

    setQuantityInputs((current) => ({
      ...current,
      [cartKey]: cleanedValue,
    }));

    const parsedUnits = parseQuantityInput(cleanedValue);
    const product = products.find((candidate) => candidate.id === productId);
    const minimumUnits = Math.max(1, product?.minOrderUnits || 1);
    const activeVariants = (product?.variants || []).filter(
      (variant) => variant.active !== false
    );
    const hasVariants = Boolean(
      product?.variantOptions?.length && activeVariants.length
    );
    const matchedVariant = hasVariants
      ? activeVariants.find((variant) => variant.key === variantKey) || null
      : null;
    const maximumUnits =
      hasVariants && matchedVariant && typeof matchedVariant.stock === "number"
        ? Math.max(0, Math.floor(matchedVariant.stock))
        : Math.max(0, product?.stock || 0);
    const nextProductTotal = hasVariants
      ? cartItems.reduce((total, item) => {
          if (item.productId !== productId) return total;

          const itemCartKey = getCartItemKey(item);
          const nextInput =
            itemCartKey === cartKey
              ? cleanedValue
              : quantityInputs[itemCartKey] ?? String(item.orderedUnits);

          return total + (parseQuantityInput(nextInput) || 0);
        }, 0)
      : parsedUnits || 0;
    const isLineQuantityValid =
      parsedUnits !== null &&
      parsedUnits <= maximumUnits &&
      (hasVariants || parsedUnits >= minimumUnits);
    const shouldShowQuantityWarning =
      !isLineQuantityValid ||
      (hasVariants && nextProductTotal < minimumUnits);

    if (quantityWarningTimerRef.current !== null) {
      window.clearTimeout(quantityWarningTimerRef.current);
      quantityWarningTimerRef.current = null;
    }

    if (isLineQuantityValid) {
      updateWholesaleCartItem(productId, parsedUnits, { variantKey });
    }

    if (!shouldShowQuantityWarning) {
      setQuantityWarning(null);
      return;
    }

    if (product) {
      const warningItem: DisplayItem = {
        productId,
        variantKey,
        orderedUnits: hasVariants ? nextProductTotal : parsedUnits ?? 0,
        cartKey,
        quantityInput: cleanedValue,
        parsedUnits: hasVariants && parsedUnits !== null ? nextProductTotal : parsedUnits,
        minimumUnits,
        maximumUnits,
        product,
        variantLabel: "",
        hasVariants,
        lineTotal: 0,
      };

      quantityWarningTimerRef.current = window.setTimeout(() => {
        setQuantityWarning(buildQuantityIssueMessage(warningItem));
        quantityWarningTimerRef.current = null;
      }, 3000);
    }
  }

  function removeItem(productId: string, variantKey = "") {
    const cartKey = `${productId}::${variantKey}`;
    setQuantityInputs((current) => {
      const next = { ...current };
      delete next[cartKey];
      return next;
    });
    removeWholesaleCartItem(productId, { variantKey });
  }

  function clearOrderItems() {
    if (submitting) return;

    setQuantityInputs({});
    setQuantityWarning(null);
    clearWholesaleCart();
  }

  async function submitOrder() {
    if (submitting) return;

    if (invalidQuantityItems.length > 0) {
      setQuantityWarning(buildQuantityIssueMessage(invalidQuantityItems[0]));
      return;
    }

    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setCreatedOrderWhatsAppUrl(null);

    try {
      const response = await fetch("/api/wholesale/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderToken: createOrderToken(),
          notes,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر إرسال طلب الجملة");
      }

      const nextCreatedOrder = (payload.order || null) as WholesaleOrder | null;

      setCreatedOrder(nextCreatedOrder);
      setCreatedOrderWhatsAppUrl(
        nextCreatedOrder ? buildWholesaleWhatsAppUrl(nextCreatedOrder) : null
      );
      setQuantityInputs({});
      setQuantityWarning(null);
      setNotes("");
      resetCartView();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "تعذر إرسال طلب الجملة"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      {quantityWarning ? (
        <div className="fixed inset-x-0 top-24 z-50 mx-auto max-w-xl px-4">
          <div
            role="alert"
            className="rounded-2xl border border-amber-200 bg-white p-4 text-amber-900 shadow-2xl shadow-slate-900/20"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-black">الكمية المختارة غير مسموح بها</p>
                <p className="mt-2 text-sm font-bold leading-7">
                  {quantityWarning}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuantityWarning(null)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-100"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl">
        <Link
          href="/wholesale/catalog"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لكتالوج الجملة
        </Link>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              طلب الجملة
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl">
              مراجعة طلب الجملة
            </h1>
            <p className="mt-3 max-w-2xl leading-8 text-slate-600">
              راجع وحدات البيع والكميات قبل إرسال الطلب. فريق سيزر سيتواصل معك يدويًا لتأكيد التفاصيل والدفع.
            </p>
          </div>
        </div>

        {createdOrder ? (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-emerald-800">
            <CheckCircle2 className="h-12 w-12" />
            <h2 className="mt-4 text-3xl font-black">تم إرسال طلب الجملة</h2>
            <p className="mt-3 leading-7">
              رقم الطلب:{" "}
              <span className="font-black" dir="ltr">
                {createdOrder.orderNumber || createdOrder.id}
              </span>
            </p>
            <p className="mt-2 leading-7">
              احتفظ بهذا الرقم، وسيتم التواصل معك على بيانات حساب الجملة المسجلة.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {createdOrderWhatsAppUrl ? (
                <a
                  href={createdOrderWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  إرسال الطلب على واتساب
                </a>
              ) : null}
              <Link
                href="/wholesale/orders"
                className="inline-flex rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 transition hover:border-emerald-400"
              >
                متابعة طلبات الجملة
              </Link>
              <Link
                href="/wholesale/catalog"
                className="inline-flex rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 transition hover:border-emerald-400"
              >
                العودة للكتالوج
              </Link>
            </div>
          </section>
        ) : loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-9 w-9 animate-spin text-orange-600" />
          </div>
        ) : error ? (
          <Alert message={error} />
        ) : !access?.canViewPrices ? (
          <Alert message="يجب تسجيل الدخول بحساب جملة مفعل قبل إرسال طلب جملة." />
        ) : displayItems.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <PackageSearch className="h-14 w-14 text-slate-300" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              لا توجد منتجات في طلب الجملة
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              أضف منتجات من كتالوج الجملة أولًا.
            </p>
            <Link
              href="/wholesale/catalog"
              className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
            >
              فتح الكتالوج
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              {displayItems.map((item) => (
                <article
                  key={item.cartKey}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[96px_minmax(0,1fr)_180px]"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                    {item.product.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name.ar || item.product.name.en}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      {item.product.name.ar || item.product.name.en}
                    </h2>
                    {item.variantLabel ? (
                      <p className="mt-1 text-xs font-black text-orange-700">
                        {item.variantLabel}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-sm font-bold text-slate-600">
                      <span>
                        أقل كمية شراء:{" "}
                        {new Intl.NumberFormat("ar-EG").format(
                          item.product.minOrderUnits || 1
                        )}{" "}
                        قطعة
                      </span>
                      <span>سعر القطعة: {formatPrice(item.product.wholesalePrice || 0)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateUnits(
                            item.productId,
                            String(Math.max(1, (item.parsedUnits || 1) - 1)),
                            item.variantKey || ""
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 transition hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantityInput}
                        onChange={(event) =>
                          updateUnits(
                            item.productId,
                            event.target.value,
                            item.variantKey || ""
                          )
                        }
                        onBlur={() => {
                          if (isDisplayItemInvalid(item)) {
                            setQuantityWarning(buildQuantityIssueMessage(item));
                          }
                        }}
                        aria-invalid={isDisplayItemInvalid(item)}
                        className={`h-10 min-w-0 flex-1 bg-transparent text-center text-sm font-black outline-none ${
                          isDisplayItemInvalid(item)
                            ? "text-rose-700"
                            : "text-slate-950"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateUnits(
                            item.productId,
                            String((item.parsedUnits || item.minimumUnits) + 1),
                            item.variantKey || ""
                          )
                        }
                        disabled={
                          item.parsedUnits !== null &&
                          item.parsedUnits >= item.maximumUnits
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 transition hover:text-orange-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {isDisplayItemInvalid(item) && (
                      <p className="text-center text-[11px] font-black text-rose-700">
                        {item.orderedUnits > item.maximumUnits
                          ? `المتاح ${new Intl.NumberFormat("ar-EG").format(item.maximumUnits)} قطعة فقط.`
                          : `أقل كمية مسموح بها ${new Intl.NumberFormat("ar-EG").format(item.minimumUnits)} قطعة.`}
                      </p>
                    )}

                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-700">
                      {formatPrice(item.lineTotal)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantKey || "")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">ملخص الطلب</h2>
                <button
                  type="button"
                  onClick={clearOrderItems}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eraser className="h-4 w-4" />
                  تفريغ الطلب
                </button>
              </div>
              <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>عدد المنتجات</span>
                  <span>{new Intl.NumberFormat("ar-EG").format(displayItems.length)}</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي القطع</span>
                  <span>
                    {new Intl.NumberFormat("ar-EG").format(
                      displayItems.reduce((total, item) => total + item.orderedUnits, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-black text-slate-950">
                  <span>الإجمالي</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-black text-slate-500">
                  ملاحظات للطلب
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  placeholder="أي ملاحظات بخصوص الكمية أو التواصل"
                />
              </label>

              <button
                type="button"
                onClick={submitOrder}
                disabled={!canSubmit || submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                إرسال طلب الجملة
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function Alert({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-amber-800">
      <ShieldAlert className="h-10 w-10" />
      <h2 className="mt-4 text-2xl font-black">تنبيه</h2>
      <p className="mt-3 leading-7">{message}</p>
      <Link
        href="/wholesale/catalog"
        className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
      >
        العودة للكتالوج
      </Link>
    </div>
  );
}
