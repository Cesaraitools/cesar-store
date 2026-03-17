"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { useLanguage } from "@/context/LanguageContext";

/* ---------------- Types ---------------- */

type Category = {
  type: "category";
  id: string;
  image: string;
  category: string;
  en: {
    title: string;
    subtitle: string;
  };
  ar: {
    title: string;
    subtitle: string;
  };
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  params: { id: string };
};

/* ---------------- Component ---------------- */

export default function ProductPage({ params }: Props) {
  const { lang } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([productsData, categoriesData]) => {
        const foundProduct = productsData.find(
          (p: Product) => p.id === params.id
        );

        if (!foundProduct) {
          setProduct(null);
          setMainImage(null);
          return;
        }

        setProduct(foundProduct);
        setMainImage(foundProduct.images?.[0] || null);
        setCategories(categoriesData);
      })
      .catch(() => {
        setProduct(null);
        setMainImage(null);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  /* ---------------- States ---------------- */

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-center text-gray-500">
          {lang === "ar" ? "جاري التحميل..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-center text-gray-500">
          {lang === "ar" ? "المنتج غير موجود" : "Product not found"}
        </p>
      </div>
    );
  }

  const category = categories.find(
    (c) => c.category === product.category
  );

  const name =
    lang === "ar" ? product.name.ar : product.name.en;

  const description =
    lang === "ar"
      ? product.description.ar
      : product.description.en;

  /* ---------------- Render ---------------- */

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
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
              {lang === "ar"
                ? category.ar.title
                : category.en.title}
            </Link>
            <span>/</span>
          </>
        )}

        <span className="text-black font-medium">
          {name}
        </span>
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="border rounded-xl p-4 flex items-center justify-center bg-gray-50 mb-4">
            {mainImage && (
              <img
                src={mainImage}
                alt={name}
                className="max-h-[350px] object-contain"
              />
            )}
          </div>

          <div className="flex gap-3">
            {product.images.map((img, index) => (
              <button
                key={index}
                onClick={() => setMainImage(img)}
                className={`border rounded-lg p-2 ${
                  mainImage === img
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={img}
                  alt=""
                  className="h-16 w-16 object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">
            {name}
          </h1>

          <p className="text-xl text-green-600 font-semibold">
            {product.price} جنيه
          </p>

          <p className="text-gray-600 leading-relaxed">
            {description}
          </p>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">
                {lang === "ar" ? "المخزون:" : "Stock:"}
              </span>{" "}
              {product.stock}{" "}
              {lang === "ar" ? "وحدة" : "units"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
