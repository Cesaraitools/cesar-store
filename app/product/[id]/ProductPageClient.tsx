"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Images, MousePointerClick } from "lucide-react";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeCategory } from "@/lib/category-normalizer";
import { trackViewItem } from "@/lib/google-ads-tracking";
import { getSafeImage } from "@/lib/image-safe";
import { getSeoProductDescription } from "@/lib/product-seo-description";
import {
  buildVariantKey,
  createVariantSnapshot,
  findProductVariant,
  getVariantDisplayImage,
  getVariantDisplayPrice,
  getVariantDisplayStock,
  productHasVariants,
} from "@/lib/product-variants";
import type { CatalogCategory } from "@/lib/server/catalog";
import { useStoreMaintenance } from "@/context/StoreMaintenanceContext";

type Props = {
  product: Product;
  categories: CatalogCategory[];
};

const PRODUCT_ZOOM_LENS_SIZE = 160;
const PRODUCT_ZOOM_FACTOR = 2.35;

export default function ProductPageClient({ product, categories }: Props) {
  const { addToCart } = useCart();
  const { lang } = useLanguage();
  const { isMaintenanceActive } = useStoreMaintenance();

  const [mainImage, setMainImage] = useState<string | null>(
    product.images?.[0] || null
  );
  const [isAdding, setIsAdding] = useState(false);
  const mainImageRef = useRef<HTMLImageElement>(null);
  const zoomLensRef = useRef<HTMLDivElement>(null);
  const zoomFrameRef = useRef<number | null>(null);
  const hasVariants = productHasVariants(product);
  const initialSelections = useMemo(() => {
    const firstAvailable =
      product.variants?.find(
        (variant) =>
          variant.active !== false && (variant.stock ?? product.stock) > 0
      ) || product.variants?.find((variant) => variant.active !== false);

    if (firstAvailable?.selections) return firstAvailable.selections;

    return Object.fromEntries(
      (product.variantOptions || []).map((option) => [
        option.id,
        option.values[0]?.id || "",
      ])
    );
  }, [product]);
  const [selectedSelections, setSelectedSelections] =
    useState<Record<string, string>>(initialSelections);

  const category = categories.find(
    (item) => normalizeCategory(item.category) === normalizeCategory(product.category)
  );

  const name = lang === "ar" ? product.name.ar : product.name.en;
  const description = getSeoProductDescription(product, lang);
  const productImages = product.images.length
    ? product.images.map((image) => getSafeImage(image))
    : [getSafeImage()];
  const selectedVariantKey = buildVariantKey(selectedSelections);
  const selectedVariant = hasVariants
    ? findProductVariant(product, selectedVariantKey)
    : null;
  const displayPrice = getVariantDisplayPrice(product, selectedVariant);
  const displayStock = getVariantDisplayStock(product, selectedVariant);
  const displayImage = getVariantDisplayImage(product, selectedVariant);
  const safeMainImage = getSafeImage(mainImage || productImages[0]);
  const isOutOfStock =
    displayStock <= 0 ||
    (hasVariants && (!selectedVariant || selectedVariant.active === false));

  useEffect(() => {
    if (selectedVariant?.image) {
      setMainImage(selectedVariant.image);
    }
  }, [selectedVariant?.image]);

  useEffect(() => {
    const lens = zoomLensRef.current;
    if (lens) {
      lens.style.opacity = "0";
      lens.style.visibility = "hidden";
    }
  }, [safeMainImage]);

  useEffect(
    () => () => {
      if (zoomFrameRef.current !== null) {
        cancelAnimationFrame(zoomFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    trackViewItem({
      id: product.id,
      name_ar: product.name.ar,
      name_en: product.name.en,
      price: displayPrice,
      category: product.category,
      variant_key: selectedVariant?.key || "",
      variant: selectedVariant
        ? createVariantSnapshot(
            product.variantOptions || [],
            selectedVariant.selections
          )
        : null,
    });
  }, [displayPrice, product, selectedVariant]);

  const handleAddToCart = () => {
    if (isMaintenanceActive || isAdding || isOutOfStock) return;

    setIsAdding(true);

    addToCart({
      id: String(product.id),
      name,
      price: displayPrice,
      image: displayImage,
      stock: displayStock,
      variant_key: selectedVariant?.key || "",
      variant: selectedVariant
        ? createVariantSnapshot(
            product.variantOptions || [],
            selectedVariant.selections
          )
        : null,
    });

    setTimeout(() => {
      setIsAdding(false);
    }, 300);
  };

  const hideZoomLens = () => {
    if (zoomFrameRef.current !== null) {
      cancelAnimationFrame(zoomFrameRef.current);
      zoomFrameRef.current = null;
    }

    const lens = zoomLensRef.current;
    if (!lens) return;
    lens.style.opacity = "0";
    lens.style.visibility = "hidden";
  };

  const handleZoomPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType !== "mouse") {
      hideZoomLens();
      return;
    }

    const clientX = event.clientX;
    const clientY = event.clientY;
    const frame = event.currentTarget;

    if (zoomFrameRef.current !== null) {
      cancelAnimationFrame(zoomFrameRef.current);
    }

    zoomFrameRef.current = requestAnimationFrame(() => {
      const image = mainImageRef.current;
      const lens = zoomLensRef.current;
      if (!image || !lens) return;

      const frameRect = frame.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const naturalRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = imageRect.width / imageRect.height;
      const contentWidth =
        naturalRatio > boxRatio ? imageRect.width : imageRect.height * naturalRatio;
      const contentHeight =
        naturalRatio > boxRatio ? imageRect.width / naturalRatio : imageRect.height;
      const contentLeft = imageRect.left + (imageRect.width - contentWidth) / 2;
      const contentTop = imageRect.top + (imageRect.height - contentHeight) / 2;
      const isOverImage =
        clientX >= contentLeft &&
        clientX <= contentLeft + contentWidth &&
        clientY >= contentTop &&
        clientY <= contentTop + contentHeight;

      if (
        !isOverImage ||
        !Number.isFinite(naturalRatio) ||
        contentWidth <= 0 ||
        contentHeight <= 0
      ) {
        lens.style.opacity = "0";
        lens.style.visibility = "hidden";
        return;
      }

      const halfLens = PRODUCT_ZOOM_LENS_SIZE / 2;
      const pointerX = clientX - frameRect.left;
      const pointerY = clientY - frameRect.top;
      const lensX = Math.min(
        frameRect.width - halfLens,
        Math.max(halfLens, pointerX)
      );
      const lensY = Math.min(
        frameRect.height - halfLens,
        Math.max(halfLens, pointerY)
      );
      const imageX = clientX - contentLeft;
      const imageY = clientY - contentTop;

      lens.style.transform = `translate3d(${lensX - halfLens}px, ${
        lensY - halfLens
      }px, 0)`;
      lens.style.backgroundSize = `${contentWidth * PRODUCT_ZOOM_FACTOR}px ${
        contentHeight * PRODUCT_ZOOM_FACTOR
      }px`;
      lens.style.backgroundPosition = `${
        halfLens - imageX * PRODUCT_ZOOM_FACTOR
      }px ${halfLens - imageY * PRODUCT_ZOOM_FACTOR}px`;
      lens.style.visibility = "visible";
      lens.style.opacity = "1";
      zoomFrameRef.current = null;
    });
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="text-sm text-gray-500 mb-6 space-x-2">
        <Link href="/" className="hover:text-black">
          {lang === "ar" ? "الرئيسية" : "Home"}
        </Link>
        <span>/</span>

        {category && (
          <>
            <Link
              href={`/shop?category=${category.category}`}
              className="hover:text-black"
            >
              {lang === "ar" ? category.ar.title : category.en.title}
            </Link>
            <span>/</span>
          </>
        )}

        <span className="text-black font-medium">{name}</span>
      </div>

      <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:gap-12">
        <div className="min-w-0">
          <div
            className="relative flex min-h-[360px] cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:min-h-[460px] sm:p-6 lg:min-h-[560px] lg:p-8"
            onPointerMove={handleZoomPointerMove}
            onPointerLeave={hideZoomLens}
            onPointerCancel={hideZoomLens}
          >
            <Image
              ref={mainImageRef}
              src={safeMainImage}
              alt={name}
              width={760}
              height={640}
              sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full max-h-[320px] object-contain sm:max-h-[420px] lg:max-h-[520px]"
              priority
              unoptimized
              onError={() => setMainImage("/placeholder.png")}
            />
            <div
              ref={zoomLensRef}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 z-10 h-40 w-40 rounded-full border-4 border-white bg-white opacity-0 shadow-[0_12px_36px_rgba(15,23,42,0.32)] ring-2 ring-blue-500 transition-opacity duration-100 will-change-transform motion-reduce:transition-none"
              style={{
                backgroundImage: `url("${safeMainImage}")`,
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
              <Images className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>
                {lang === "ar"
                  ? "صور المنتج للمعاينة فقط"
                  : "Product images are for preview only"}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {productImages.map((image, index) => {
                const isPreviewed =
                  getSafeImage(mainImage || productImages[0]) === image;

                return (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setMainImage(image)}
                    aria-pressed={isPreviewed}
                    aria-label={
                      lang === "ar"
                        ? `معاينة صورة المنتج ${index + 1}`
                        : `Preview product image ${index + 1}`
                    }
                    className={`rounded-xl border bg-white p-2 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      isPreviewed
                        ? "border-slate-900 shadow-sm"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${name}-${index + 1}`}
                      width={72}
                      height={72}
                      sizes="72px"
                      className="h-[72px] w-[72px] object-contain"
                      unoptimized
                      onError={() => setMainImage("/placeholder.png")}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-5 lg:py-2">
          <h1 className="text-3xl font-bold">{name}</h1>

          <p
            className={`text-xl font-semibold ${
              isMaintenanceActive ? "text-blue-700" : "text-green-600"
            }`}
          >
            {isMaintenanceActive
              ? lang === "ar"
                ? "يتم تحديث الأسعار الآن"
                : "Prices are being updated"
              : `${displayPrice} ${lang === "ar" ? "جنيه" : "EGP"}`}
          </p>

          <p className="text-gray-600 leading-relaxed">{description}</p>

          {hasVariants && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm sm:p-5">
              <div
                role="note"
                className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <MousePointerClick className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black">
                    {lang === "ar"
                      ? "اختر المواصفة من الاسم"
                      : "Choose the specification by name"}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-6 text-blue-800 sm:text-sm">
                    {lang === "ar"
                      ? "اضغط على اسم المواصفة المطلوبة من الأزرار أدناه قبل الإضافة للسلة. الصور المصغرة أسفل صورة المنتج للمعاينة فقط ولا تغيّر اختيارك."
                      : "Select the required option using the named buttons below before adding to cart. The thumbnails under the product image are for preview only and do not change your selection."}
                  </p>
                </div>
              </div>

              {(product.variantOptions || []).map((option) => {
                const selectedValue = option.values.find(
                  (value) => selectedSelections[option.id] === value.id
                );

                return (
                  <div key={option.id}>
                    <p className="mb-2 text-sm font-black text-slate-900">
                      {lang === "ar" ? option.name.ar : option.name.en}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const selected =
                          selectedSelections[option.id] === value.id;

                        return (
                          <button
                            key={value.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setSelectedSelections((prev) => ({
                                ...prev,
                                [option.id]: value.id,
                              }))
                            }
                            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                              selected
                                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                            }`}
                          >
                            {lang === "ar" ? value.label.ar : value.label.en}
                          </button>
                        );
                      })}
                    </div>

                    {selectedValue && (
                      <div
                        className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700"
                        aria-live="polite"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {lang === "ar" ? "اختيارك الحالي:" : "Current selection:"}{" "}
                          {lang === "ar"
                            ? selectedValue.label.ar
                            : selectedValue.label.en}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">
                {lang === "ar" ? "المخزون:" : "Stock:"}
              </span>{" "}
              {displayStock} {lang === "ar" ? "وحدة" : "units"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isMaintenanceActive || isAdding || isOutOfStock}
            className="w-full rounded-lg bg-black px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMaintenanceActive
              ? lang === "ar"
                ? "الشراء متوقف مؤقتًا"
                : "Purchases temporarily paused"
              : isOutOfStock
              ? lang === "ar"
                ? "نفد المخزون"
                : "Out of stock"
              : isAdding
              ? lang === "ar"
                ? "جاري الإضافة..."
                : "Adding..."
              : lang === "ar"
              ? "أضف إلى السلة"
              : "Add to Cart"}
          </button>
        </div>
      </div>
      </section>
    </div>
  );
}
