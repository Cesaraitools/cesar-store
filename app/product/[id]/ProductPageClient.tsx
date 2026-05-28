"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeCategory } from "@/lib/category-normalizer";
import { getSafeImage } from "@/lib/image-safe";
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

  const category = categories.find(
    (item) => normalizeCategory(item.category) === normalizeCategory(product.category)
  );

  const name = lang === "ar" ? product.name.ar : product.name.en;
  const description =
    lang === "ar" ? product.description.ar : product.description.en;
  const productImages = product.images.length
    ? product.images.map((image) => getSafeImage(image))
    : [getSafeImage()];
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (isAdding || isOutOfStock) return;

    setIsAdding(true);

    addToCart({
      id: String(product.id),
      name,
      price: product.price,
      image: product.images?.[0] || "/placeholder.png",
      stock: product.stock,
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
            <img
              src={getSafeImage(mainImage || productImages[0])}
              alt={name}
              className="max-h-[350px] object-contain"
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
                <img
                  src={image}
                  alt={`${name}-${index + 1}`}
                  className="h-16 w-16 object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{name}</h1>

          <p className="text-xl text-green-600 font-semibold">
            {product.price} جنيه
          </p>

          <p className="text-gray-600 leading-relaxed">{description}</p>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">
                {lang === "ar" ? "المخزون:" : "Stock:"}
              </span>{" "}
              {product.stock} {lang === "ar" ? "وحدة" : "units"}
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
