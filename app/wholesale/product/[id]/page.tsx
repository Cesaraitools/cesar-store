"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  PackageSearch,
  ShieldAlert,
  ShoppingCart,
} from "lucide-react";
import { useWholesaleCart } from "@/context/WholesaleDbCartContext";
import { createVariantSnapshot } from "@/lib/product-variants";
import type { ProductVariantSnapshot } from "@/types/product";
import type {
  WholesaleCatalogAccess,
  WholesaleCatalogProduct,
} from "@/types/wholesale";

type ProductResponse = {
  product: WholesaleCatalogProduct | null;
  access: WholesaleCatalogAccess;
  error?: string;
};

function formatPrice(value: number | null) {
  if (!value || value <= 0) return "لم يتم تحديد السعر";

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

function getProductName(product: WholesaleCatalogProduct | null) {
  return product?.name.ar || product?.name.en || "منتج الجملة";
}

export default function WholesaleProductPage() {
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const { addItem: addWholesaleCartItem } = useWholesaleCart();
  const [product, setProduct] = useState<WholesaleCatalogProduct | null>(null);
  const [access, setAccess] = useState<WholesaleCatalogAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityWarning, setQuantityWarning] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [variantQuantities, setVariantQuantities] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      if (!productId) {
        setError("رابط المنتج غير صحيح");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/wholesale/catalog/${encodeURIComponent(productId)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const payload = (await response.json().catch(() => null)) as ProductResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error || "تعذر تحميل منتج الجملة");
        }

        setProduct(payload?.product || null);
        setAccess(payload?.access || null);
        setQuantityInput(String(payload?.product?.minOrderUnits || 1));
      } catch (productError) {
        if (controller.signal.aborted) return;

        setError(
          productError instanceof Error
            ? productError.message
            : "تعذر تحميل منتج الجملة"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [productId]);

  const variantOptions = product?.variantOptions || [];
  const activeVariants = useMemo(
    () => (product?.variants || []).filter((variant) => variant.active !== false),
    [product?.variants]
  );
  const hasVariants = Boolean(variantOptions.length && activeVariants.length);
  const minimumUnits = Math.max(1, product?.minOrderUnits || 1);
  const productStock = Math.max(0, product?.stock || 0);
  const parsedUnits = parseQuantityInput(quantityInput);
  const variantRows = activeVariants.map((variant) => {
    const input = variantQuantities[variant.key] || "";
    const parsedQuantity = parseQuantityInput(input) || 0;
    const stock =
      typeof variant.stock === "number"
        ? Math.max(0, Math.floor(variant.stock))
        : productStock;
    const snapshot = createVariantSnapshot(variantOptions, variant.selections);

    return {
      variant,
      input,
      parsedQuantity,
      stock,
      snapshot,
      label: snapshot.label_ar || snapshot.label_en || variant.key,
      image: variant.image || product?.image || null,
    };
  });
  const totalVariantUnits = variantRows.reduce(
    (total, row) => total + row.parsedQuantity,
    0
  );
  const hasSelectedVariantQuantity = variantRows.some((row) => row.parsedQuantity > 0);
  const hasInvalidVariantQuantity = variantRows.some(
    (row) => row.parsedQuantity > row.stock
  );
  const canAddVariantSelection =
    Boolean(product?.priceVisible && product?.wholesalePrice && product.wholesalePrice > 0) &&
    hasSelectedVariantQuantity &&
    totalVariantUnits >= minimumUnits &&
    !hasInvalidVariantQuantity;
  const canAddSimpleProduct =
    Boolean(product?.priceVisible && product?.wholesalePrice && product.wholesalePrice > 0) &&
    parsedUnits !== null &&
    parsedUnits >= minimumUnits &&
    parsedUnits <= productStock;
  const primaryImage =
    variantRows.find((row) => row.parsedQuantity > 0 && row.image)?.image ||
    product?.image ||
    "/placeholder.png";
  const productDescription =
    product?.description.ar?.trim() || product?.description.en?.trim() || "";

  const showWarning = useCallback((message: string) => {
    setQuantityWarning(message);
  }, []);

  function updateVariantQuantity(variantKey: string, value: string) {
    const cleanedValue = value.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, "");
    setVariantQuantities((current) => ({
      ...current,
      [variantKey]: cleanedValue,
    }));
  }

  function getSimpleQuantityWarning() {
    const productName = getProductName(product);

    if (parsedUnits !== null && parsedUnits > productStock) {
      return `الكمية المتاحة حاليًا من المنتج "${productName}" هي ${new Intl.NumberFormat(
        "ar-EG"
      ).format(productStock)} قطعة فقط.`;
    }

    return `أقل كمية شراء للمنتج "${productName}" هي ${new Intl.NumberFormat(
      "ar-EG"
    ).format(minimumUnits)} قطعة.`;
  }

  function getVariantQuantityWarning() {
    const productName = getProductName(product);
    const overStockVariant = variantRows.find((row) => row.parsedQuantity > row.stock);

    if (overStockVariant) {
      return `الكمية المتاحة من "${productName}" - ${overStockVariant.label} هي ${new Intl.NumberFormat(
        "ar-EG"
      ).format(overStockVariant.stock)} قطعة فقط.`;
    }

    return `أقل كمية شراء للمنتج "${productName}" هي ${new Intl.NumberFormat(
      "ar-EG"
    ).format(minimumUnits)} قطعة. يمكنك توزيعها على أكثر من اختيار.`;
  }

  function addSelectionToCart() {
    if (!product) return;

    if (hasVariants) {
      if (!canAddVariantSelection) {
        showWarning(getVariantQuantityWarning());
        return;
      }

      for (const row of variantRows) {
        if (row.parsedQuantity <= 0) continue;

        addWholesaleCartItem(product, row.parsedQuantity, {
          variantKey: row.variant.key,
          variant: row.snapshot as ProductVariantSnapshot,
        });
      }
    } else {
      if (!canAddSimpleProduct || parsedUnits === null) {
        showWarning(getSimpleQuantityWarning());
        return;
      }

      addWholesaleCartItem(product, parsedUnits);
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 pb-16 text-slate-950">
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

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <Link
          href="/wholesale/catalog"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لمتجر الجملة
        </Link>

        {loading ? (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-9 w-9 animate-spin text-orange-600" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-rose-700">
            <ShieldAlert className="h-10 w-10" />
            <h1 className="mt-4 text-2xl font-black">تعذر تحميل المنتج</h1>
            <p className="mt-3 leading-7">{error}</p>
          </div>
        ) : !access?.canViewPrices ? (
          <div className="rounded-2xl border border-amber-100 bg-white p-8 shadow-sm">
            <LockKeyhole className="h-12 w-12 text-amber-600" />
            <h1 className="mt-5 text-2xl font-black text-slate-950">
              تفاصيل الجملة متاحة للتجار المفعلين فقط
            </h1>
            <p className="mt-3 max-w-2xl leading-8 text-slate-600">
              يجب تسجيل الدخول بحساب تم اعتماده وتفعيله من إدارة سيزر قبل عرض تفاصيل وأسعار الجملة.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/wholesale/account"
                className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
              >
                حالة حساب الجملة
              </Link>
              <Link
                href="/wholesale/apply"
                className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                طلب الانضمام للجملة
              </Link>
            </div>
          </div>
        ) : product ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src={primaryImage}
                  alt={getProductName(product)}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-contain p-6"
                  unoptimized
                />
              </div>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h2 className="text-base font-black text-slate-950">
                  تفاصيل المنتج
                </h2>
                {productDescription ? (
                  <p className="mt-3 whitespace-pre-line text-sm font-bold leading-8 text-slate-600">
                    {productDescription}
                  </p>
                ) : (
                  <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
                    لا توجد تفاصيل إضافية مسجلة لهذا المنتج حاليًا.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                حساب الجملة مفعل
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950">
                {getProductName(product)}
              </h1>
              <div className="mt-2 text-sm font-black text-orange-600">
                {product.category}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Info label="سعر جملة القطعة" value={formatPrice(product.wholesalePrice)} />
                <Info
                  label="أقل كمية شراء"
                  value={`${new Intl.NumberFormat("ar-EG").format(minimumUnits)} قطعة`}
                />
                <Info
                  label="المتاح"
                  value={`${new Intl.NumberFormat("ar-EG").format(productStock)} قطعة`}
                />
              </div>

              {product.notes ? (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
                  {product.notes}
                </div>
              ) : null}

              {hasVariants ? (
                <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-emerald-950">
                        اختيارات المنتج
                      </h2>
                      <p className="mt-1 text-xs font-bold text-emerald-700">
                        اختر كميات الجملة من أكثر من اختيار، بشرط أن يكون المجموع مساويًا للحد الأدنى أو أكبر.
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-800">
                      الإجمالي: {new Intl.NumberFormat("ar-EG").format(totalVariantUnits)} /{" "}
                      {new Intl.NumberFormat("ar-EG").format(minimumUnits)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {variantRows.map((row) => (
                      <label
                        key={row.variant.key}
                        className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-950">
                            {row.label}
                          </span>
                          <span className="mt-1 block text-xs font-bold text-slate-500">
                            المتاح: {new Intl.NumberFormat("ar-EG").format(row.stock)} قطعة
                          </span>
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={row.input}
                          onChange={(event) =>
                            updateVariantQuantity(row.variant.key, event.target.value)
                          }
                          onBlur={() => {
                            if (!canAddVariantSelection && hasSelectedVariantQuantity) {
                              showWarning(getVariantQuantityWarning());
                            }
                          }}
                          aria-invalid={row.parsedQuantity > row.stock}
                          className={`h-11 rounded-xl border bg-white px-3 text-center text-sm font-black outline-none focus:ring-2 ${
                            row.parsedQuantity > row.stock
                              ? "border-rose-300 text-rose-800 focus:border-rose-500 focus:ring-rose-100"
                              : "border-emerald-200 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-100"
                          }`}
                        />
                      </label>
                    ))}
                  </div>

                  {!canAddVariantSelection && hasSelectedVariantQuantity ? (
                    <p className="mt-3 text-xs font-black text-rose-700">
                      {hasInvalidVariantQuantity
                        ? "إحدى الكميات المختارة أكبر من المخزون المتاح."
                        : `أقل كمية مسموح بها ${new Intl.NumberFormat("ar-EG").format(minimumUnits)} قطعة لمجموع الاختيارات.`}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <label className="block">
                    <span className="text-xs font-black text-emerald-700">
                      عدد القطع
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={quantityInput}
                      onChange={(event) =>
                        setQuantityInput(
                          event.target.value.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, "")
                        )
                      }
                      onBlur={() => {
                        if (!canAddSimpleProduct) {
                          showWarning(getSimpleQuantityWarning());
                        }
                      }}
                      aria-invalid={!canAddSimpleProduct}
                      className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-center text-sm font-black outline-none focus:ring-2 ${
                        !canAddSimpleProduct
                          ? "border-rose-300 text-rose-800 focus:border-rose-500 focus:ring-rose-100"
                          : "border-emerald-200 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-100"
                      }`}
                    />
                  </label>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addSelectionToCart}
                  disabled={hasVariants ? !canAddVariantSelection : !canAddSimpleProduct}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {added ? "تمت الإضافة" : "إضافة لسلة الجملة"}
                </button>
                <Link
                  href="/wholesale/order"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                >
                  <PackageSearch className="h-5 w-5" />
                  مراجعة الطلب
                </Link>
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-2xl font-black text-slate-950">
              المنتج غير متاح في كتالوج الجملة
            </h1>
          </div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-1 text-base font-black text-slate-950">{value}</div>
    </div>
  );
}
