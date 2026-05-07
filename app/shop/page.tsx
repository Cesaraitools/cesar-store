"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductGrid from "@/components/product/ProductGrid";
import ShopSidePromoSlider from "@/components/promo/ShopSidePromoSlider";
import { sortProducts, SortOption } from "@/lib/filters";
import { useLanguage } from "@/context/LanguageContext";
import type { Product } from "@/types/product";
import type { PromoData } from "@/types/promo";
import {
  ChevronRight,
  ArrowRight,
  SlidersHorizontal,
  PackageSearch,
  Search,
  Tag,
} from "lucide-react";

type Category = {
  type: "category";
  id: string;
  image: string;
  category: string;
  en: { title: string; subtitle: string };
  ar: { title: string; subtitle: string };
  active: boolean;
  order: number;
};

type Props = {
  searchParams: { category?: string };
};

export default function ShopPage({ searchParams }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [sort, setSort] = useState<SortOption>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.category || "all"
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<PromoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/promos").then((r) => r.json()),
    ])
      .then(([productsData, categoriesData, promosData]) => {
        const safeProducts = Array.isArray(productsData)
          ? productsData.filter(
              (p: Product) => p.active !== false && p.stock > 0
            )
          : [];

        setProducts(safeProducts);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setPromos(Array.isArray(promosData) ? promosData : []);
      })
      .catch((error) => {
        console.error("Shop Error:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      const matchesSearch =
        normalizedQuery.length === 0 ||
        product.name.ar.toLowerCase().includes(normalizedQuery) ||
        product.name.en.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const finalProducts = useMemo(
    () => sortProducts(filteredProducts, sort),
    [filteredProducts, sort]
  );

  const currentCategory = visibleCategories.find(
    (category) => category.category === selectedCategory
  );
  const categoryTitle = currentCategory
    ? isAr
      ? currentCategory.ar.title
      : currentCategory.en.title
    : isAr
    ? "كل المنتجات"
    : "All Products";

  const leftPromo = promos.find(
    (promo) => promo.position === "shop_left" && promo.isActive
  );
  const rightPromo = promos.find(
    (promo) => promo.position === "shop_right" && promo.isActive
  );
  const hasShopSidePromos = Boolean(leftPromo || rightPromo);
  const hasActiveFilters =
    selectedCategory !== "all" || searchQuery.trim().length > 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-400 animate-pulse">
          {isAr ? "جاري تجهيز المنتجات..." : "Preparing products..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFDFF] pb-20" dir={isAr ? "rtl" : "ltr"}>
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
          {selectedCategory !== "all" && (
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 mb-6 text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-all shadow-sm shadow-blue-50"
            >
              {isAr ? (
                <ArrowRight size={14} />
              ) : (
                <ChevronRight size={14} className="rotate-180" />
              )}
              {isAr ? "الرجوع للأقسام" : "Back to Categories"}
            </Link>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                {categoryTitle}
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-sm font-bold text-gray-400">
                  {finalProducts.length}{" "}
                  {isAr ? "منتج متاح في المتجر" : "products available now"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto md:min-w-[760px]">
              <div className="relative">
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? "ابحث باسم المنتج" : "Search by product name"}
                  className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 pr-12 text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-600/10 transition-all hover:bg-gray-100 shadow-sm"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                  <Tag size={16} />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 pr-12 text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer transition-all hover:bg-gray-100 shadow-sm"
                >
                  <option value="all">
                    {isAr ? "كل الأقسام" : "All Categories"}
                  </option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.category}>
                      {isAr ? category.ar.title : category.en.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={16} />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="w-full appearance-none bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 pr-12 text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer transition-all hover:bg-gray-100 shadow-sm"
                >
                  <option value="default">
                    {isAr ? "الترتيب الافتراضي" : "Default Sorting"}
                  </option>
                  <option value="price-asc">
                    {isAr ? "السعر: من الأقل للأعلى" : "Price: Low to High"}
                  </option>
                  <option value="price-desc">
                    {isAr ? "السعر: من الأعلى للأقل" : "Price: High to Low"}
                  </option>
                  <option value="featured">
                    {isAr ? "الأكثر تميزاً" : "Featured Products"}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50"
              >
                {isAr ? "مسح البحث والفلاتر" : "Clear search and filters"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1500px] px-6">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px] items-start">
          <div className="order-1">
            {leftPromo ? (
              <ShopSidePromoSlider promo={leftPromo} lang={lang} />
            ) : (
              <div className="hidden xl:block" />
            )}
          </div>

          <div
            className={`order-3 xl:order-2 ${
              hasShopSidePromos
                ? "[&>div>div]:xl:grid-cols-2 [&>div>div]:2xl:grid-cols-3"
                : ""
            }`}
          >
            {finalProducts.length === 0 ? (
              <div className="bg-white rounded-[3rem] border border-dashed border-gray-200 py-24 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <PackageSearch size={40} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  {isAr ? "لم نجد أي منتجات هنا" : "No products found"}
                </h3>
                <p className="text-gray-400 max-w-xs mx-auto text-sm font-bold">
                  {isAr
                    ? "جرّب اسم منتج آخر أو اختر قسمًا مختلفًا."
                    : "Try another product name or a different category."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSort("default");
                  }}
                  className="mt-8 bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  {isAr ? "عرض كل المنتجات" : "View All Products"}
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ProductGrid products={finalProducts} />
              </div>
            )}
          </div>

          <div className="order-2 xl:order-3">
            {rightPromo ? (
              <ShopSidePromoSlider promo={rightPromo} lang={lang} />
            ) : (
              <div className="hidden xl:block" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
