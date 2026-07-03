"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  PackageSearch,
  Search,
  ShieldAlert,
  ShoppingCart,
  Store,
  Tag,
  X,
} from "lucide-react";
import { useWholesaleCart } from "@/context/WholesaleDbCartContext";
import type {
  WholesaleCatalogAccess,
  WholesaleCatalogProduct,
  WholesaleCustomerStatus,
} from "@/types/wholesale";

type CatalogResponse = {
  products: WholesaleCatalogProduct[];
  access: WholesaleCatalogAccess;
};

const emptyAccess: WholesaleCatalogAccess = {
  signedIn: false,
  canViewPrices: false,
  wholesaleStatus: null,
};

const statusLabels: Record<WholesaleCustomerStatus, string> = {
  pending_account: "الحساب بانتظار التفعيل",
  active: "حساب الجملة مفعل",
  suspended: "حساب الجملة موقوف",
};

function normalizeSearchText(input: string) {
  return input
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0625\u0623\u0622\u0627]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCategory(category: string) {
  return category
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

export default function WholesaleCatalogPage() {
  const [products, setProducts] = useState<WholesaleCatalogProduct[]>([]);
  const [access, setAccess] = useState<WholesaleCatalogAccess>(emptyAccess);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityWarning, setQuantityWarning] = useState<string | null>(null);
  const {
    items: wholesaleCartItems,
    itemCount: wholesaleCartCount,
    addItem: addWholesaleCartItem,
    replaceItems: replaceWholesaleCartItems,
  } = useWholesaleCart();

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
              : "تعذر تحميل كتالوج الجملة"
          );
        }

        const safePayload = payload as CatalogResponse;
        setProducts(Array.isArray(safePayload.products) ? safePayload.products : []);
        setAccess(safePayload.access || emptyAccess);
      } catch (catalogError) {
        if (controller.signal.aborted) return;

        setError(
          catalogError instanceof Error
            ? catalogError.message
            : "تعذر تحميل كتالوج الجملة"
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
    if (!access.canViewPrices || loading || products.length === 0) return;

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
    const nextCart = wholesaleCartItems.filter((item) =>
      availableProductIds.has(item.productId)
    );

    if (nextCart.length !== wholesaleCartItems.length) {
      replaceWholesaleCartItems(nextCart);
    }
  }, [
    access.canViewPrices,
    loading,
    products,
    replaceWholesaleCartItems,
    wholesaleCartItems,
  ]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category))).sort(
      (a, b) => formatCategory(a).localeCompare(formatCategory(b), ["ar", "en"])
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const haystack = normalizeSearchText(
        `${product.name.ar} ${product.name.en} ${formatCategory(product.category)}`
      );

      return haystack.includes(normalizedQuery);
    });
  }, [products, searchQuery, selectedCategory]);

  const accessState = getAccessState(access);

  function addToWholesaleCart(
    product: WholesaleCatalogProduct,
    orderedUnits: number
  ) {
    addWholesaleCartItem(product, orderedUnits);
  }

  const showQuantityWarning = useCallback((message: string) => {
    setQuantityWarning(message);
  }, []);

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

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <Link
            href="/wholesale"
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
          >
            <ArrowRight className="h-4 w-4" />
            العودة لقسم الجملة
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
                <Store className="h-4 w-4 text-orange-600" />
                كتالوج الجملة
              </div>
              <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                منتجات سيزر المتاحة لتجارة الجملة
              </h1>
              <p className="mt-3 max-w-2xl leading-8 text-slate-600">
                كتالوج وأسعار الجملة متاحة فقط لحسابات تجار الجملة المعتمدة والمفعلة من إدارة سيزر.
              </p>
            </div>

            <div
              className={`rounded-2xl border px-5 py-4 text-sm font-bold ${accessState.className}`}
            >
              <div className="flex items-center gap-3">
                <accessState.icon className="h-5 w-5 shrink-0" />
                <span>{accessState.title}</span>
              </div>
              <p className="mt-2 max-w-md leading-6 text-current/80">
                {accessState.description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/wholesale/order"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
            >
              <ShoppingCart className="h-4 w-4" />
              طلب الجملة
              {wholesaleCartCount > 0 ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-950">
                  {new Intl.NumberFormat("ar-EG").format(wholesaleCartCount)}
                </span>
              ) : null}
            </Link>
            <Link
              href="/wholesale/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              <PackageSearch className="h-4 w-4" />
              متابعة طلباتي
            </Link>
          </div>
        </div>
      </section>

      {loading || access.canViewPrices ? (
      <section className="sticky top-20 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.6fr)_auto] md:px-8">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث باسم المنتج"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 pr-12 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="relative block">
            <Tag className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 pr-12 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">كل الأقسام</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-600">
            {filteredProducts.length} منتج
          </div>
        </div>
      </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {loading ? (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-9 w-9 animate-spin text-orange-600" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-rose-700">
            <ShieldAlert className="h-10 w-10" />
            <h2 className="mt-4 text-2xl font-black">تعذر تحميل الكتالوج</h2>
            <p className="mt-3 leading-7">{error}</p>
          </div>
        ) : !access.canViewPrices ? (
          <div className="rounded-2xl border border-amber-100 bg-white p-8 shadow-sm">
            <LockKeyhole className="h-12 w-12 text-amber-600" />
            <h2 className="mt-5 text-2xl font-black text-slate-950">
              متجر الجملة متاح للتجار المفعلين فقط
            </h2>
            <p className="mt-3 max-w-2xl leading-8 text-slate-600">
              يجب تسجيل الدخول بحساب تم اعتماده وتفعيله من إدارة سيزر قبل عرض كتالوج وأسعار الجملة.
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
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <PackageSearch className="h-14 w-14 text-slate-300" />
            <h2 className="mt-5 text-2xl font-black text-slate-950">
              لا توجد منتجات مطابقة
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              جرّب اسم منتج آخر أو اعرض كل الأقسام.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                canViewPrices={access.canViewPrices}
                onAddToCart={addToWholesaleCart}
                onInvalidQuantity={showQuantityWarning}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function getAccessState(access: WholesaleCatalogAccess) {
  if (access.canViewPrices) {
    return {
      title: "الأسعار ووحدات الجملة ظاهرة",
      description: "حسابك مفعل ويمكنه عرض بيانات الجملة الخاصة بكل منتج.",
      icon: CheckCircle2,
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }

  if (access.signedIn) {
    return {
      title: access.wholesaleStatus
        ? statusLabels[access.wholesaleStatus]
        : "لم يتم ربط حساب جملة",
      description:
        "يمكنك تصفح المنتجات الآن، لكن الأسعار ستظهر بعد اعتماد الحساب وتفعيله من الإدارة.",
      icon: LockKeyhole,
      className: "border-amber-100 bg-amber-50 text-amber-700",
    };
  }

  return {
    title: "الأسعار مخفية",
    description:
      "سجل الدخول بحساب الجملة المعتمد أو قدم طلب انضمام لعرض الأسعار والحد الأدنى للشراء.",
    icon: LockKeyhole,
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function ProductCard({
  product,
  canViewPrices,
  onAddToCart,
  onInvalidQuantity,
}: {
  product: WholesaleCatalogProduct;
  canViewPrices: boolean;
  onAddToCart: (product: WholesaleCatalogProduct, orderedUnits: number) => void;
  onInvalidQuantity: (message: string) => void;
}) {
  const minimumUnits = Math.max(1, product.minOrderUnits || 1);
  const [orderedUnits, setOrderedUnits] = useState(String(minimumUnits));
  const [quantityWasEdited, setQuantityWasEdited] = useState(false);
  const [added, setAdded] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const variantOptions = product.variantOptions || [];
  const activeVariants = useMemo(
    () => (product.variants || []).filter((variant) => variant.active !== false),
    [product.variants]
  );
  const hasVariants = variantOptions.length > 0 && activeVariants.length > 0;
  const parsedUnits = parseQuantityInput(orderedUnits);
  const isBelowMinimum = parsedUnits !== null && parsedUnits < minimumUnits;
  const isAboveStock = parsedUnits !== null && parsedUnits > product.stock;
  const hasValidQuantity =
    parsedUnits !== null && parsedUnits >= minimumUnits && parsedUnits <= product.stock;
  const quantityIssueMessage = useMemo(() => {
    const productName = product.name.ar || product.name.en || "هذا المنتج";
    if (parsedUnits !== null && parsedUnits > product.stock) {
      return `الكمية المتاحة حاليا من المنتج "${productName}" هي ${new Intl.NumberFormat(
        "ar-EG"
      ).format(product.stock)} قطعة فقط. عدل الكمية حتى يمكن إضافة المنتج.`;
    }

    return `أقل كمية شراء للمنتج "${productName}" هي ${new Intl.NumberFormat(
      "ar-EG"
    ).format(minimumUnits)} قطعة. عدل الكمية إلى الحد الأدنى أو أكثر حتى يمكنك إضافة المنتج.`;
  }, [minimumUnits, parsedUnits, product.name.ar, product.name.en, product.stock]);
  const canAddToCart =
    canViewPrices &&
    product.wholesalePrice !== null &&
    product.wholesalePrice > 0 &&
    !hasVariants &&
    hasValidQuantity;
  const productName = product.name.ar || product.name.en;
  const productDetailsHref = `/wholesale/product/${product.id}`;

  function handleQuantityChange(value: string) {
    const cleanedValue = value.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, "");
    setQuantityWasEdited(true);
    setOrderedUnits(cleanedValue);
  }

  useEffect(() => {
    if (!quantityWasEdited) return;
    if (hasVariants) return;
    if (!isBelowMinimum && !isAboveStock) return;

    const warningTimer = window.setTimeout(() => {
      onInvalidQuantity(quantityIssueMessage);
    }, 3000);

    return () => window.clearTimeout(warningTimer);
  }, [
    hasVariants,
    isAboveStock,
    isBelowMinimum,
    onInvalidQuantity,
    orderedUnits,
    quantityWasEdited,
    quantityIssueMessage,
  ]);

  useEffect(() => {
    if (!isImageOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsImageOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isImageOpen]);

  function addProduct() {
    if (!hasValidQuantity || parsedUnits === null) {
      onInvalidQuantity(quantityIssueMessage);
      return;
    }

    onAddToCart(product, parsedUnits);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
      <button
        type="button"
        onClick={() => product.image && setIsImageOpen(true)}
        disabled={!product.image}
        className="relative block aspect-square w-full bg-slate-100 disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        aria-label={`عرض صورة ${productName}`}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={productName}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Building2 className="h-14 w-14 text-slate-300" />
          </span>
        )}
      </button>

      <div className="space-y-4 p-5">
        <div>
          <div className="text-xs font-black text-orange-600">
            {formatCategory(product.category)}
          </div>
          <Link href={productDetailsHref}>
            <h2 className="mt-2 line-clamp-2 min-h-14 text-lg font-black leading-7 text-slate-950 transition hover:text-orange-700">
              {productName}
            </h2>
          </Link>
          <div className="mt-2 text-xs font-bold text-slate-400">
            متوفر: {new Intl.NumberFormat("ar-EG").format(product.stock)}
          </div>
          <Link
            href={productDetailsHref}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
          >
            تفاصيل المنتج
          </Link>
        </div>

        {canViewPrices ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <div className="text-xs font-black text-emerald-600">سعر جملة القطعة</div>
            <div className="mt-1 text-2xl font-black">
              {formatPrice(product.wholesalePrice)}
            </div>
            <div className="mt-3 grid gap-2 text-xs font-bold text-emerald-700">
              <span>
                أقل كمية شراء:{" "}
                {new Intl.NumberFormat("ar-EG").format(
                  product.minOrderUnits || 1
                )}{" "}
                قطعة
              </span>
            </div>
            {product.notes ? (
              <p className="mt-3 border-t border-emerald-100 pt-3 text-xs leading-6">
                {product.notes}
              </p>
            ) : null}
            {hasVariants ? (
              <div className="mt-4 border-t border-emerald-100 pt-4">
                <div className="rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-xs font-black text-emerald-800">
                  هذا المنتج يحتوي على {new Intl.NumberFormat("ar-EG").format(activeVariants.length)} اختيار.
                </div>
                <Link
                  href={productDetailsHref}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"
                >
                  <ShoppingCart className="h-4 w-4" />
                  اختيار مواصفات الجملة
                </Link>
              </div>
            ) : (
            <div className="mt-4 flex items-end gap-2 border-t border-emerald-100 pt-4">
              <label className="block flex-1">
                <span className="text-[11px] font-black text-emerald-700">
                  عدد القطع
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={orderedUnits}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  onBlur={() => {
                    if (isBelowMinimum || isAboveStock || parsedUnits === null) {
                      onInvalidQuantity(quantityIssueMessage);
                    }
                  }}
                  aria-invalid={isBelowMinimum || isAboveStock || parsedUnits === null}
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-black outline-none focus:ring-2 ${
                    isBelowMinimum || isAboveStock || parsedUnits === null
                      ? "border-rose-300 text-rose-800 focus:border-rose-500 focus:ring-rose-100"
                      : "border-emerald-200 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
                {(isBelowMinimum || isAboveStock || parsedUnits === null) && (
                  <span className="mt-1 block text-[11px] font-black text-rose-700">
                    {isAboveStock
                      ? `المتاح ${new Intl.NumberFormat("ar-EG").format(product.stock)} قطعة فقط.`
                      : `أقل كمية مسموح بها ${new Intl.NumberFormat("ar-EG").format(minimumUnits)} قطعة.`}
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={addProduct}
                disabled={!canAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-200"
              >
                <ShoppingCart className="h-4 w-4" />
                {added ? "تمت الإضافة" : "إضافة"}
              </button>
            </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800">
              <LockKeyhole className="h-4 w-4" />
              سعر الجملة مخفي
            </div>
            <p className="mt-2 text-xs font-bold leading-6">
              يظهر سعر جملة القطعة وأقل كمية شراء بعد تفعيل حساب الجملة.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/wholesale/account"
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-600"
              >
                حالة الحساب
              </Link>
              <Link
                href="/wholesale/apply"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                طلب انضمام
              </Link>
            </div>
          </div>
        )}
      </div>
    </article>

      {isImageOpen && product.image ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`صورة ${productName}`}
          onClick={() => setIsImageOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageOpen(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="إغلاق الصورة"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div
            className="relative h-[92vh] w-[94vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={product.image}
              alt={productName}
              fill
              sizes="94vw"
              className="object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
