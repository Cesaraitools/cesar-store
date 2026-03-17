"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/category/CategoryCard";
import SidePromoCard from "@/components/promo/SidePromoCard";
import { useLanguage } from "@/context/LanguageContext";
import { LayoutGrid, Sparkles } from "lucide-react";

export default function CategoriesPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [categories, setCategories] = useState<any[]>([]);
  const [promo, setPromo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/promos").then((r) => r.json()),
    ])
      .then(([categoriesData, promosData]) => {
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        const sidePromo = promosData.find(
          (p: any) => p.position === "categories_side" && p.isActive
        );
        setPromo(sidePromo || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">جاري التحميل...</div>;

  return (
    <main className="min-h-screen bg-[#FCFDFF] pb-24" dir={isAr ? "rtl" : "ltr"}>
      {/* Header القسم العلوي */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
         <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
           {isAr ? "أقسام متجر سيزر" : "CESAR Categories"}
         </h1>
         <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full"></div>
      </div>

      {/* Content Section - تعديل التوزيع هنا */}
      <section className="mx-auto max-w-[1400px] px-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        
        {/* Categories Grid - حجم أكبر للأقسام */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.id} className="group relative overflow-hidden rounded-[2.5rem] h-[350px] shadow-sm transition-all hover:shadow-xl">
              {/* قمنا بتكبير ارتفاع الكارت وإضافة تأثير بصري */}
              <CategoryCard category={cat} />
            </div>
          ))}
        </div>

        {/* Side Promo - حجم أقل للبرومو */}
        {promo && (
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {isAr ? "عرض خاص" : "Hot Deal"}
                </span>
              </div>
              {/* تصغير حجم حاوية البرومو الجانبي */}
              <div className="scale-95 origin-top transform transition-transform hover:scale-100">
                <SidePromoCard promo={promo} lang={lang} />
              </div>
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}