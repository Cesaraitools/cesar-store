"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductGrid from "@/components/product/ProductGrid";
import ShopSidePromoSlider from "@/components/promo/ShopSidePromoSlider";
import { normalizeCategory } from "@/lib/category-normalizer";
import { getSeoProductDescriptions } from "@/lib/product-seo-description";
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
  Sparkles,
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
  const seoDescriptions = getSeoProductDescriptions(product);
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
      `${product.description.ar} ${product.description.en} ${seoDescriptions.ar} ${seoDescriptions.en}`
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
  const activeFilterCount =
    Number(selectedCategory !== "all") +
    Number(searchQuery.trim().length > 0) +
    Number(sort !== "default");
  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSort("default");
  };

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
    <div
      className="min-h-screen bg-[linear-gradient(135deg,#f0fbff_0%,#fbfffc_42%,#fff7ed_100%)] pb-20"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="border-b border-white/70 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 md:py-12">
          {selectedCategory !== "all" && (
            <Link
              href="/categories"
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-5 py-2.5 text-xs font-black text-blue-600 shadow-sm shadow-blue-50 transition-all hover:bg-blue-100"
            >
              {isAr ? (
                <ArrowRight size={14} />
              ) : (
                <ChevronRight size={14} className="rotate-180" />
              )}
              {isAr ? "الرجوع للأقسام" : "Back to Categories"}
            </Link>
          )}

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black text-slate-950 sm:text-4xl md:text-5xl">
                {categoryTitle}
                <Sparkles className="h-6 w-6 text-amber-500 sm:h-8 sm:w-8" />
              </h1>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-sm font-bold text-slate-400">
                  {finalProducts.length}{" "}
                  {isAr ? "منتج متاح في المتجر" : "products available now"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-20 z-30 border-b border-white/60 bg-white/82 shadow-[0_14px_50px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 md:py-4">
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="mobile-shop-filters"
              className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-blue-600" />
                {isAr ? "البحث والفلترة" : "Search and filters"}
              </span>
              <span className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronRight
                  size={18}
                  className={`transition-transform ${
                    mobileFiltersOpen
                      ? isAr
                        ? "-rotate-90"
                        : "rotate-90"
                      : isAr
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </span>
            </button>

            {mobileFiltersOpen && (
              <div
                id="mobile-shop-filters"
                className="mt-3 grid grid-cols-1 gap-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-xl"
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? "ابحث باسم المنتج" : "Search by product name"}
                    className="w-full rounded-full border border-slate-100 bg-slate-50 px-5 py-3.5 pr-12 text-sm font-bold text-slate-700 shadow-inner transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <Tag size={17} />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-full border border-slate-100 bg-slate-50 px-5 py-3.5 pr-12 text-sm font-bold text-slate-700 shadow-inner transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
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
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <SlidersHorizontal size={17} />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="w-full cursor-pointer appearance-none rounded-full border border-slate-100 bg-slate-50 px-5 py-3.5 pr-12 text-sm font-bold text-slate-700 shadow-inner transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
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

                <div className="grid grid-cols-2 gap-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-600"
                    >
                      {isAr ? "مسح الفلاتر" : "Clear filters"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className={`rounded-full bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-md active:scale-95 ${
                      hasActiveFilters ? "" : "col-span-2"
                    }`}
                  >
                    {isAr
                      ? `عرض ${finalProducts.length} منتج`
                      : `Show ${finalProducts.length} products`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden gap-3 md:grid md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث باسم المنتج" : "Search by product name"}
                className="w-full rounded-full border border-slate-100 bg-slate-50 px-5 py-3.5 pr-12 text-xs font-bold text-slate-700 shadow-inner transition-all hover:bg-slate-100 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <Tag size={17} />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-full border border-slate-100 bg-slate-50 px-5 py-3.5 pr-12 text-xs font-bold text-slate-700 shadow-inner transition-all hover:bg-slate-100 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
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
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <SlidersHorizontal size={17} />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full cursor-pointer appearance-none rounded-full border border-slate-100 bg-slate-50 px-5 py-3.5 pr-12 text-xs font-bold text-slate-700 shadow-inner transition-all hover:bg-slate-100 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
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
                onClick={clearFilters}
                className="rounded-full border-2 border-dashed border-rose-200 bg-rose-50/70 px-6 py-2 text-xs font-black text-rose-500 transition-all hover:border-rose-300 hover:bg-rose-50 md:self-center"
              >
                {isAr ? "مسح الفلاتر" : "Clear filters"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-[1820px] px-4 sm:mt-12 sm:px-6">
        <div className="grid items-start justify-center gap-8 xl:grid-cols-[220px_minmax(0,1fr)_220px] 2xl:grid-cols-[240px_minmax(0,1200px)_240px]">
          <div className="hidden xl:order-1 xl:block">
            {leftPromo ? (
              <ShopSidePromoSlider promo={leftPromo} lang={lang} />
            ) : (
              <aside className="hidden min-h-[580px] items-center justify-center rounded-[2.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-300 shadow-sm xl:sticky xl:top-40 xl:flex">
                {isAr ? "مكان بلوك العرض الترويجي الأيسر" : "Left promo block"}
              </aside>
            )}
          </div>

          <div className="order-1 mx-auto w-full max-w-[1200px] xl:order-2">
            {finalProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-slate-200 bg-white py-24 text-center shadow-sm">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 shadow-inner">
                  <PackageSearch size={40} className="text-slate-300" />
                </div>
                <h3 className="mb-2 text-xl font-black text-slate-900">
                  {isAr ? "لم نجد أي منتجات هنا" : "No products found"}
                </h3>
                <p className="mx-auto max-w-xs text-sm font-bold text-slate-400">
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
                  className="mt-8 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-black text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                >
                  {isAr ? "عرض كل المنتجات" : "View All Products"}
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <ProductGrid products={finalProducts} />
              </div>
            )}
          </div>

          <div className="hidden xl:order-3 xl:block">
            {rightPromo ? (
              <ShopSidePromoSlider promo={rightPromo} lang={lang} />
            ) : (
              <aside className="hidden min-h-[580px] items-center justify-center rounded-[2.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-300 shadow-sm xl:sticky xl:top-40 xl:flex">
                {isAr ? "مكان بلوك العرض الترويجي الأيمن" : "Right promo block"}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
