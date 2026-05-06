"use client";

import Link from "next/link";
import { useState } from "react";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { getSafeImage } from "@/lib/image-safe";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const { lang } = useLanguage();

  const [isAdding, setIsAdding] = useState(false);
  const isOutOfStock = product.stock <= 0;
  const threshold = product.low_stock_threshold ?? 10;
const isLowStock = product.stock > 0 && product.stock <= threshold;

  const name = lang === "ar" ? product.name.ar : product.name.en;
  const description =
    lang === "ar" ? product.description.ar : product.description.en;

  const handleAddToCart = () => {
    if (isAdding || isOutOfStock) return;

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
    <div className="border border-gray-100 rounded-[2.5rem] bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-[520px] overflow-hidden">
      <Link href={`/product/${product.id}`}>
        <div className="h-[240px] bg-gray-100 flex items-center justify-center rounded-t-2xl overflow-hidden">
          <img
            src={getSafeImage(product.images?.[0])}
            alt={name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
            }}
          />
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-bold text-base text-gray-900 leading-tight">
            {name}
          </h3>
        </Link>

        <p className="text-sm text-gray-400 line-clamp-2 text-ellipsis overflow-hidden">{description}</p>

        <div className="mt-auto">
          <p className="text-green-600 font-bold text-base mb-2">
            {product.price} جنيه
          </p>

          <p className="text-xs font-semibold mb-1 text-slate-500">
  {lang === "ar"
    ? `المتاح: ${product.stock}`
    : `Available: ${product.stock}`}
</p>

{isLowStock && (
  <p className="text-xs font-bold text-red-600 mb-3">
    {lang === "ar" ? "قارب على النفاذ" : "Low stock"}
  </p>
)}

          <button
            onClick={handleAddToCart}
            disabled={isAdding || isOutOfStock}
            className="w-full bg-black text-white py-2 text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
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
