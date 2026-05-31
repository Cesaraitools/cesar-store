"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductGrid from "@/components/product/ProductGrid";
import ShopSidePromoSlider from "@/components/promo/ShopSidePromoSlider";
import { normalizeCategory } from "@/lib/category-normalizer";
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
  searchParams: { category?: string; search?: string };
};

const GENERIC_SEARCH_TOKENS = new Set([
  "سياره",
  "سيارات",
  "السياره",
  "السيارات",
  "للسياره",
  "للسيارات",
  "منتج",
  "منتجات",
  "متجر",
  "سيزر",
  "ستور",
  "شوب",
  "car",
  "cars",
  "auto",
  "vehicle",
  "vehicles",
  "product",
  "products",
  "store",
  "shop",
  "egypt",
]);

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

function tokenizeSearch(input: string) {
  const tokens = normalizeSearchText(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  const specificTokens = tokens.filter((token) => !GENERIC_SEARCH_TOKENS.has(token));

  return specificTokens.length > 0 ? specificTokens : tokens;
}

function getProductSearchText(product: Product) {
  const variantText =
    product.variantOptions
      ?.flatMap((option) => [
        option.name.ar,
        option.name.en,
        ...option.values.flatMap((value) => [value.label.ar, value.label.en]),
      ])
      .join(" ") || "";

  return {
    name: normalizeSearchText(`${product.name.ar} ${product.name.en}`),
    description: normalizeSearchText(
      `${product.description.ar} ${product.description.en}`
    ),
    category: normalizeSearchText(normalizeCategory(product.category)),
    variants: normalizeSearchText(variantText),
  };
}

function scoreProductSearch(product: Product, query: string, tokens: string[]) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 1;

  const searchable = getProductSearchText(product);
  const haystack = [
    searchable.name,
    searchable.description,
    searchable.category,
    searchable.variants,
  ].join(" ");

  let score = 0;

  if (searchable.name.includes(normalizedQuery)) score += 30;
  else if (haystack.includes(normalizedQuery)) score += 18;

  let matchedTokens = 0;

  for (const token of tokens) {
    if (searchable.name.includes(token)) {
      score += 8;
      matchedTokens += 1;
    } else if (searchable.description.includes(token)) {
      score += 4;
      matchedTokens += 1;
    } else if (searchable.category.includes(token)) {
      score += 3;
      matchedTokens += 1;
    } else if (searchable.variants.includes(token)) {
      score += 3;
      matchedTokens += 1;
    }
  }

  if (tokens.length > 0 && matchedTokens === tokens.length) score += 12;
  if (tokens.length > 1 && matchedTokens > 0) score += matchedTokens / tokens.length;
  if (score > 0 && product.stock > 0) score += 1;

  return score;
}

export default function ShopPage({ searchParams }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [sort, setSort] = useState<SortOption>("default");
  const [searchQuery, setSearchQuery] = useState(searchParams.search || "");
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

  const categoryOrder = useMemo(() => {
    const order = new Map<string, number>();

    visibleCategories.forEach((category, index) => {
      order.set(
        normalizeCategory(category.category),
        typeof category.order === "number" ? category.order : index
      );
    });

    return order;
  }, [visibleCategories]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    const queryTokens = tokenizeSearch(searchQuery);
    const normalizedSelectedCategory = normalizeCategory(selectedCategory);

    const matches = products.flatMap((product) => {
      const matchesCategory =
        selectedCategory === "all" ||
        normalizeCategory(product.category) === normalizedSelectedCategory;

      if (!matchesCategory) return [];

      const searchScore = scoreProductSearch(product, normalizedQuery, queryTokens);

      if (normalizedQuery.length > 0 && searchScore <= 0) return [];

      return [{ product, searchScore }];
    });

    if (normalizedQuery.length === 0) {
      return matches.map((item) => item.product);
    }

    return matches
      .sort((a, b) => {
        if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;

        return a.product.name.ar.localeCompare(b.product.name.ar, ["ar", "en"], {
          numeric: true,
          sensitivity: "base",
        });
      })
      .map((item) => item.product);
  }, [products, searchQuery, selectedCategory]);

  const finalProducts = useMemo(() => {
    if (searchQuery.trim().length > 0 && sort === "default") return filteredProducts;

    return sortProducts(filteredProducts, sort, categoryOrder);
  }, [categoryOrder, filteredProducts, searchQuery, sort]);

  const currentCategory = visibleCategories.find(
    (category) =>
      normalizeCategory(category.category) === normalizeCategory(selectedCategory)
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
  const hasActiveFilters =
    selectedCategory !== "all" || searchQuery.trim().length > 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl sm:text-4xl font-black text-gray-900">
          تسوق منتجات السيارات من متجر سيزر | Cesar Store car products
        </h1>
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-8 md:py-12">
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

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
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
          </div>
        </div>
      </div>

      <div className="sticky top-20 z-30 border-b border-gray-100 bg-white/92 backdrop-blur-md">
        <div className="mx-auto max-w-[1500px] px-3 sm:px-6 py-3 sm:py-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="relative">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث باسم المنتج" : "Search by product name"}
                className="w-full bg-gray-50 border-none rounded-2xl sm:rounded-[1.5rem] px-4 sm:px-6 py-3 sm:py-4 pr-10 sm:pr-12 text-xs sm:text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-600/10 transition-all hover:bg-gray-100 shadow-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <Tag size={16} />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-gray-50 border-none rounded-2xl sm:rounded-[1.5rem] px-4 sm:px-6 py-3 sm:py-4 pr-10 sm:pr-12 text-xs sm:text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer transition-all hover:bg-gray-100 shadow-sm"
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
                className="w-full appearance-none bg-gray-50 border-none rounded-2xl sm:rounded-[1.5rem] px-4 sm:px-6 py-3 sm:py-4 pr-10 sm:pr-12 text-xs sm:text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer transition-all hover:bg-gray-100 shadow-sm"
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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 md:self-center"
              >
                {isAr ? "مسح الفلاتر" : "Clear filters"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 sm:mt-12 max-w-[1820px] px-3 sm:px-6">
        <div className="grid justify-center gap-6 xl:grid-cols-[220px_minmax(0,1fr)_220px] 2xl:grid-cols-[240px_minmax(0,1200px)_240px] items-start">
          <div className="order-1">
            {leftPromo ? (
              <ShopSidePromoSlider promo={leftPromo} lang={lang} />
            ) : (
              <aside className="hidden xl:flex xl:sticky xl:top-32 min-h-[560px] rounded-[2.5rem] border border-dashed border-gray-200 bg-white items-center justify-center p-8 text-center text-sm font-bold text-gray-300">
                {isAr ? "مكان بلوك العرض الترويجي الأيسر" : "Left promo block"}
              </aside>
            )}
          </div>

          <div className="order-3 xl:order-2 mx-auto w-full max-w-[1200px]">
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
              <aside className="hidden xl:flex xl:sticky xl:top-32 min-h-[560px] rounded-[2.5rem] border border-dashed border-gray-200 bg-white items-center justify-center p-8 text-center text-sm font-bold text-gray-300">
                {isAr ? "مكان بلوك العرض الترويجي الأيمن" : "Right promo block"}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
