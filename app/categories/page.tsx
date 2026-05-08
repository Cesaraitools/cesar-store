"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/category/CategoryCard";
import ShopSidePromoSlider from "@/components/promo/ShopSidePromoSlider";
import { useLanguage } from "@/context/LanguageContext";
import type { PromoData } from "@/types/promo";
import { Shapes } from "lucide-react";

export default function CategoriesPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [categories, setCategories] = useState<any[]>([]);
  const [promos, setPromos] = useState<PromoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/promos").then((r) => r.json()),
    ])
      .then(([categoriesData, promosData]) => {
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setPromos(Array.isArray(promosData) ? promosData : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const legacyPromo = promos.find(
    (promo) => promo.position === "categories_side" && promo.isActive
  );
  const leftPromo =
    promos.find(
      (promo) => promo.position === "categories_left" && promo.isActive
    ) || legacyPromo;
  const rightPromo = promos.find(
    (promo) => promo.position === "categories_right" && promo.isActive
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 font-black text-slate-400 animate-pulse">
          {isAr ? "نجهز الأقسام..." : "Loading Categories..."}
        </p>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#F8FAFC] pb-24 relative overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10"></div>
      <div className="absolute top-40 left-[-5%] w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute top-20 right-[-5%] w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] -z-10"></div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white shadow-xl shadow-blue-900/5 rounded-2xl mb-4 text-blue-600">
          <Shapes size={28} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight">
          {isAr ? "أقسام متجر سيزر" : "CESAR Categories"}
        </h1>
        <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed text-lg">
          {isAr
            ? "استكشف مجموعتنا المختارة بعناية من أفضل منتجات العناية بالسيارات"
            : "Explore our handpicked collection of the best automotive care products"}
        </p>
      </div>

      <section className="mx-auto max-w-[1740px] px-6">
        <div className="grid justify-center gap-6 xl:grid-cols-[220px_minmax(0,1fr)_220px] 2xl:grid-cols-[240px_minmax(0,1120px)_240px] items-start">
          <div className="order-1">
            {leftPromo ? (
              <ShopSidePromoSlider promo={leftPromo} lang={lang} />
            ) : (
              <aside className="hidden xl:flex xl:sticky xl:top-32 min-h-[560px] rounded-[2.5rem] border border-dashed border-gray-200 bg-white items-center justify-center p-8 text-center text-sm font-bold text-gray-300">
                {isAr ? "مكان بلوك عروض الأقسام الأيسر" : "Left categories promo block"}
              </aside>
            )}
          </div>

          <div className="order-3 xl:order-2 mx-auto w-full max-w-[1120px]">
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="group relative h-[400px] rounded-[3rem] overflow-hidden bg-white shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <CategoryCard category={cat} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-2 xl:order-3">
            {rightPromo ? (
              <ShopSidePromoSlider promo={rightPromo} lang={lang} />
            ) : (
              <aside className="hidden xl:flex xl:sticky xl:top-32 min-h-[560px] rounded-[2.5rem] border border-dashed border-gray-200 bg-white items-center justify-center p-8 text-center text-sm font-bold text-gray-300">
                {isAr ? "مكان بلوك عروض الأقسام الأيمن" : "Right categories promo block"}
              </aside>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
