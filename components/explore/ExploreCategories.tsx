"use client";

import categories from "@/data-store/categories.json";
import { useLanguage } from "@/context/LanguageContext";
import CategoryCard from "@/components/category/CategoryCard";

export default function ExploreCategories() {
  const { lang } = useLanguage();

  return (
    <section className="px-6 py-16 bg-white">
      <h2 className="text-3xl font-bold mb-10 text-center text-gray-900">
        {lang === "ar" ? "تسوق حسب الفئة" : "Shop by Category"}
      </h2>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat: any) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}