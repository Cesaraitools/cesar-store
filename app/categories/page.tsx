"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/category/CategoryCard";
import SidePromoCard from "@/components/promo/SidePromoCard";
import { useLanguage } from "@/context/LanguageContext";
import { LayoutGrid, Sparkles, Shapes, ArrowRightLeft } from "lucide-react";

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
      <div className="absolute top-20 right-[-10%] w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] -z-10"></div>

      {/* Header - تصميم عصري مع أيقونة */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
         <div className="inline-flex items-center justify-center w-16 h-16 bg-white shadow-xl shadow-blue-900/5 rounded-3xl mb-6 text-blue-600">
            <Shapes size={32} />
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

      {/* Content Section */}
      <section className="mx-auto max-w-[1400px] px-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        
        {/* Categories Grid - تحسين البطاقات */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
          {categories.map((cat, idx) => (
            <div 
              key={cat.id} 
              className="group relative h-[400px] rounded-[3rem] overflow-hidden bg-white shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 hover:-translate-y-2"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <CategoryCard category={cat} />
              
              {/* تأثير Overlay عند التحويم (اختياري حسب تصميم الـ Card) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
          ))}
        </div>

        {/* Side Promo - تصميم أكثر أناقة وتثبيت (Sticky) */}
        {promo && (
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-sm font-black text-slate-700 uppercase tracking-wider">
                    {isAr ? "عرض حصري" : "Special Offer"}
                  </span>
                </div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              </div>

              {/* حاوية البرومو الجانبي مع تأثير زجاجي */}
              <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 transition-transform duration-500 hover:rotate-1 hover:scale-[1.02]">
                <SidePromoCard promo={promo} lang={lang} />
              </div>

              {/* صندوق معلومات إضافي (اختياري لملء المساحة) */}
              <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                <p className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-widest">{isAr ? "شحن مجاني" : "Free Shipping"}</p>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                  {isAr ? "احصل على شحن مجاني عند طلب أكثر من 1000 جنيه" : "Get free shipping on orders over 1000 EGP"}
                </p>
              </div>
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}