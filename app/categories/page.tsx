"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/category/CategoryCard";
import ShopSidePromoSlider from "@/components/promo/ShopSidePromoSlider";
import { useLanguage } from "@/context/LanguageContext";
import type { PromoData } from "@/types/promo";
import { Shapes, Sparkles } from "lucide-react";

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

  const glowGradients = [
    "from-cyan-500/20 to-blue-500/20",
    "from-amber-500/20 to-orange-500/20",
    "from-emerald-500/20 to-teal-500/20",
    "from-purple-500/20 to-pink-500/20",
    "from-rose-500/20 to-red-500/20",
    "from-indigo-500/20 to-blue-600/20",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900">
          أقسام متجر سيزر | Cesar Store categories
        </h1>
        <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 font-black text-slate-400 animate-pulse">
          {isAr ? "نجهز الأقسام..." : "Loading Categories..."}
        </p>
      </div>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#FAFAFA] pb-24"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[linear-gradient(135deg,rgba(224,242,254,0.86)_0%,rgba(240,253,250,0.72)_38%,rgba(255,247,237,0.72)_72%,rgba(255,255,255,0)_100%)]" />

      <div className="mx-auto max-w-7xl px-6 pb-12 pt-12 text-center">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-xl shadow-blue-900/5">
          <Shapes size={32} />
        </div>
        <h1 className="mb-4 flex items-center justify-center gap-3 text-4xl font-black text-slate-900 md:text-6xl">
          {isAr ? "أقسام متجر سيزر" : "CESAR Categories"}
          <Sparkles className="hidden text-amber-500 md:block" size={36} />
        </h1>
        <p className="mx-auto max-w-xl text-base font-bold leading-relaxed text-slate-500 md:text-lg">
          {isAr
            ? "استكشف مجموعتنا المختارة بعناية من أفضل منتجات العناية بالسيارات"
            : "Explore our handpicked collection of the best automotive care products"}
        </p>
      </div>

      <section className="mx-auto max-w-[1740px] px-6">
        <div className="grid justify-center gap-6 xl:grid-cols-[220px_minmax(0,1fr)_220px] 2xl:grid-cols-[240px_minmax(0,1120px)_240px] items-start">
          <div className="hidden xl:order-1 xl:block">
            {leftPromo ? (
              <ShopSidePromoSlider promo={leftPromo} lang={lang} />
            ) : (
              <aside className="hidden xl:flex xl:sticky xl:top-32 min-h-[560px] rounded-[2.5rem] border border-dashed border-gray-200 bg-white items-center justify-center p-8 text-center text-sm font-bold text-gray-300">
                {isAr ? "مكان بلوك عروض الأقسام الأيسر" : "Left categories promo block"}
              </aside>
            )}
          </div>

          <div className="order-1 mx-auto w-full max-w-[1120px] xl:order-2">
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat, idx) => {
                const currentGradient = glowGradients[idx % glowGradients.length];

                return (
                  <div
                    key={cat.id}
                    className="group relative h-[400px] overflow-hidden rounded-[2.5rem] border border-white/70 bg-white p-2 shadow-md shadow-slate-200/70 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-300/70 md:h-[420px]"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${currentGradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                      aria-hidden="true"
                    />
                    <div className="relative z-10 h-full overflow-hidden rounded-[2.1rem] bg-slate-50">
                      <CategoryCard category={cat} />
                    </div>
                    <div
                      className="absolute inset-x-6 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden xl:order-3 xl:block">
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
