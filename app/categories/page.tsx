"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/category/CategoryCard";
import SidePromoCard from "@/components/promo/SidePromoCard";
import { useLanguage } from "@/context/LanguageContext";
import { Shapes, Sparkles } from "lucide-react";

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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 font-black text-slate-400 animate-pulse">
        {isAr ? "نجهز الأقسام..." : "Loading Categories..."}
      </p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 relative overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      
      {/* عناصر خلفية ديكورية */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10"></div>
      <div className="absolute top-40 left-[-5%] w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute top-20 right-[-5%] w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] -z-10"></div>

      {/* Header Section - تم تقليل pt-20 إلى pt-6 و pb-16 إلى pb-10 لرفع المحتوى */}
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

      {/* Categories Content */}
      <section className="mx-auto max-w-[1400px] px-6">
        
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

        {promo && (
          <div className="mt-20 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
               <div className="h-px bg-slate-200 flex-grow"></div>
               <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                  <Sparkles size={16} className="text-amber-600" />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest">
                    {isAr ? "عروض خاصة" : "Special Offers"}
                  </span>
               </div>
               <div className="h-px bg-slate-200 flex-grow"></div>
            </div>
            <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 transition-transform duration-500 hover:scale-[1.01]">
                <SidePromoCard promo={promo} lang={lang} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}