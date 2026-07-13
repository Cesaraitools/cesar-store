"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeCategory } from "@/lib/category-normalizer";
import { getSafeImage } from "@/lib/image-safe";
import { getProductVariants, productHasVariants } from "@/lib/product-variants";

type Props = {
  product: Product;
};

const productThemes: Record<
  string,
  { shell: string; media: string; price: string; button: string }
> = {
  "additives-fluids": {
    shell: "hover:shadow-cyan-200/60",
    media: "from-cyan-50 via-emerald-50 to-blue-100",
    price: "text-cyan-700",
    button: "bg-cyan-600 hover:bg-cyan-700",
  },
  detergent: {
    shell: "hover:shadow-sky-200/60",
    media: "from-sky-50 via-teal-50 to-slate-100",
    price: "text-sky-700",
    button: "bg-sky-600 hover:bg-sky-700",
  },
  "cars-accessories": {
    shell: "hover:shadow-amber-200/60",
    media: "from-amber-50 via-orange-50 to-yellow-100",
    price: "text-amber-700",
    button: "bg-amber-500 text-slate-950 hover:bg-amber-600",
  },
  "air-fresheners": {
    shell: "hover:shadow-lime-200/60",
    media: "from-lime-50 via-emerald-50 to-green-100",
    price: "text-lime-700",
    button: "bg-lime-500 text-slate-950 hover:bg-lime-600",
  },
  equipment: {
    shell: "hover:shadow-violet-200/60",
    media: "from-violet-50 via-fuchsia-50 to-slate-100",
    price: "text-violet-700",
    button: "bg-violet-600 hover:bg-violet-700",
  },
  "cars-lights": {
    shell: "hover:shadow-rose-200/60",
    media: "from-rose-50 via-red-50 to-slate-100",
    price: "text-rose-700",
    button: "bg-rose-600 hover:bg-rose-700",
  },
};

const fallbackTheme = {
  shell: "hover:shadow-slate-200/70",
  media: "from-slate-50 via-blue-50 to-cyan-50",
  price: "text-emerald-700",
  button: "bg-slate-900 hover:bg-black",
};

const badgeStyles = {
  new: { label: "New", className: "bg-emerald-500 text-white" },
  sale: { label: "Sale", className: "bg-rose-500 text-white" },
  best: { label: "Top Seller", className: "bg-amber-400 text-slate-950" },
};

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const { lang } = useLanguage();

  const [isAdding, setIsAdding] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const hasVariants = productHasVariants(product);
  const variantStock = hasVariants
    ? getProductVariants(product).reduce((total, variant) => {
        if (typeof variant.stock !== "number" || !Number.isFinite(variant.stock)) {
          return total;
        }

        return total + Math.max(0, Math.floor(variant.stock));
      }, 0)
    : null;
  const displayStock = variantStock ?? product.stock;
  const isOutOfStock = displayStock <= 0;
  const threshold = product.low_stock_threshold ?? 10;
const isLowStock = displayStock > 0 && displayStock <= threshold;

  const name = lang === "ar" ? product.name.ar : product.name.en;
  const description =
    lang === "ar" ? product.description.ar : product.description.en;
  const imageSrc = getSafeImage(product.images?.[0]);
  const [displayImageSrc, setDisplayImageSrc] = useState(imageSrc);
  const theme = productThemes[normalizeCategory(product.category)] ?? fallbackTheme;
  const badge = product.badge ? badgeStyles[product.badge] : null;

  useEffect(() => {
    setDisplayImageSrc(imageSrc);
  }, [imageSrc]);

  useEffect(() => {
    if (!isImageOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isImageOpen]);

  const handleAddToCart = () => {
    if (isAdding || isOutOfStock || hasVariants) return;

    setIsAdding(true);

    addToCart({
      id: String(product.id),
      name: name,
      price: product.price,
      image: product.images?.[0] || "/placeholder.png",
      stock: product.stock,
    });

    setTimeout(() => {
      setIsAdding(false);
    }, 300);
  };

  return (
    <>
      <div
        className={`group relative flex min-h-[360px] flex-col overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-md shadow-slate-200/55 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:min-h-[440px] lg:min-h-[460px] ${theme.shell}`}
      >
      {badge && (
        <div
          className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[10px] font-black shadow-lg shadow-black/10 sm:text-xs ${badge.className}`}
        >
          {badge.label}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsImageOpen(true)}
        className="relative m-3 mb-1 flex h-[160px] cursor-zoom-in items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:m-4 sm:h-[230px] lg:h-[245px]"
        aria-label={lang === "ar" ? `عرض صورة ${name}` : `View ${name} image`}
      >
        <span
          className={`absolute h-[124px] w-[124px] rounded-full bg-gradient-to-br ${theme.media} shadow-inner shadow-white/80 transition duration-500 group-hover:scale-105 sm:h-[188px] sm:w-[188px] lg:h-[204px] lg:w-[204px]`}
          aria-hidden="true"
        />
        <Image
          src={displayImageSrc}
          alt={name}
          width={220}
          height={220}
          sizes="(min-width: 1024px) 220px, (min-width: 640px) 204px, 132px"
          className="relative z-10 h-[132px] w-[132px] object-contain p-3 mix-blend-multiply transition duration-500 group-hover:scale-105 sm:h-[204px] sm:w-[204px] sm:p-5 lg:h-[220px] lg:w-[220px]"
          onError={() => setDisplayImageSrc("/placeholder.png")}
        />
      </button>

      <div className="flex flex-col gap-1.5 p-3 pt-2 sm:gap-2 sm:p-4 sm:pt-2">
        <Link href={`/product/${product.id}`}>
          <h3 className="min-h-[2.2rem] text-[13px] font-black leading-snug text-slate-950 line-clamp-2 transition group-hover:text-slate-700 sm:min-h-0 sm:text-base">
            {name}
          </h3>
        </Link>

        <p className="overflow-hidden text-ellipsis text-[11px] font-semibold leading-relaxed text-slate-400 line-clamp-2 sm:text-sm">
          {description}
        </p>

        <div className="mt-1 sm:mt-2">
          <p className={`mb-1 text-sm font-black sm:mb-2 sm:text-base ${theme.price}`}>
            {product.price} جنيه
          </p>

          <p className="text-[11px] sm:text-xs font-semibold mb-1 text-slate-500">
  {lang === "ar"
    ? hasVariants
      ? `إجمالي المتغيرات: ${displayStock}`
      : `المتاح: ${displayStock}`
    : hasVariants
    ? `Options total: ${displayStock}`
    : `Available: ${displayStock}`}
</p>

{isLowStock && (
  <p className="text-[11px] sm:text-xs font-bold text-red-600 mb-2 sm:mb-3">
    {lang === "ar" ? "قارب على النفاذ" : "Low stock"}
  </p>
)}

          {hasVariants ? (
            <Link
              href={`/product/${product.id}`}
              className={`block w-full rounded-xl py-2.5 text-center text-[12px] font-black text-white shadow-lg shadow-slate-200 transition active:scale-95 sm:text-sm ${theme.button}`}
            >
              {lang === "ar" ? "اختيار المواصفات" : "Choose options"}
            </Link>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              className={`w-full rounded-xl py-2.5 text-[12px] font-black text-white shadow-lg shadow-slate-200 transition active:scale-95 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:text-sm ${theme.button}`}
            >
              {isOutOfStock
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
          )}
        </div>
      </div>
      </div>

      {isImageOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ar" ? `صورة ${name}` : `${name} image`}
          onClick={() => setIsImageOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageOpen(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={lang === "ar" ? "إغلاق الصورة" : "Close image"}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <Image
            src={displayImageSrc}
            alt={name}
            width={1200}
            height={1200}
            sizes="94vw"
            className="max-h-[92vh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onError={() => setDisplayImageSrc("/placeholder.png")}
          />
        </div>
      )}
    </>
  );
}
