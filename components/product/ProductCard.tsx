"use client";

import Link from "next/link";
import { useState } from "react";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const { lang } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const imageSrc =
    !imgError && product.images && product.images.length > 0
      ? product.images[0]
      : "/placeholder.png";

  const name =
    lang === "ar" ? product.name.ar : product.name.en;

  const description =
    lang === "ar"
      ? product.description.ar
      : product.description.en;

  const handleAddToCart = () => {
    addToCart({
  id: product.id,
  name: lang === "ar" ? product.name.ar : product.name.en,
  price: product.price,
  image: product.images?.[0] || "/placeholder.png",
});
  };

  return (
    <div className="border rounded-2xl bg-white shadow-sm hover:shadow-lg transition flex flex-col h-[420px]">
      {/* Image */}
      <Link href={`/product/${product.id}`}>
        <div className="h-[240px] bg-gray-100 flex items-center justify-center rounded-t-2xl overflow-hidden">
          <img
            src={imageSrc}
            alt={name}
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
            {name}
          </h3>
        </Link>

        <p className="text-xs text-gray-500 line-clamp-2">
          {description}
        </p>

        <div className="mt-auto">
          <p className="text-green-600 font-bold text-base mb-2">
            {product.price} جنيه
          </p>

          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white py-2 text-sm rounded-lg hover:opacity-90 transition"
          >
            {lang === "ar" ? "أضف إلى السلة" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
