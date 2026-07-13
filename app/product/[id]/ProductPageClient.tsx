"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeCategory } from "@/lib/category-normalizer";
import { getSafeImage } from "@/lib/image-safe";
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

type Props = {
  product: Product;
  categories: CatalogCategory[];
};

export default function ProductPageClient({ product, categories }: Props) {
  const { addToCart } = useCart();
  const { lang } = useLanguage();

  const [mainImage, setMainImage] = useState<string | null>(
    product.images?.[0] || null
  );
  const [isAdding, setIsAdding] = useState(false);
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
  const description =
    lang === "ar" ? product.description.ar : product.description.en;
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

  const handleAddToCart = () => {
    if (isAdding || isOutOfStock) return;

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="border rounded-xl p-4 flex items-center justify-center bg-gray-50 mb-4">
            <Image
              src={safeMainImage}
              alt={name}
              width={520}
              height={420}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="max-h-[350px] object-contain"
              onError={() => setMainImage("/placeholder.png")}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {productImages.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setMainImage(image)}
                className={`border rounded-lg p-2 ${
                  getSafeImage(mainImage || productImages[0]) === image
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                <Image
                  src={image}
                  alt={`${name}-${index + 1}`}
                  width={64}
                  height={64}
                  sizes="64px"
                  className="h-16 w-16 object-contain"
                  onError={() => setMainImage("/placeholder.png")}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{name}</h1>

          <p className="text-xl text-green-600 font-semibold">
            {displayPrice} جنيه
          </p>

          <p className="text-gray-600 leading-relaxed">{description}</p>

          {hasVariants && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              {(product.variantOptions || []).map((option) => (
                <div key={option.id}>
                  <p className="mb-2 text-sm font-bold text-gray-800">
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
                          onClick={() =>
                            setSelectedSelections((prev) => ({
                              ...prev,
                              [option.id]: value.id,
                            }))
                          }
                          className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                            selected
                              ? "border-black bg-black text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          {lang === "ar" ? value.label.ar : value.label.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
            disabled={isAdding || isOutOfStock}
            className="w-full rounded-lg bg-black px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
}
