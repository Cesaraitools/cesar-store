"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowLeft, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

/* ---------------- Types ---------------- */
type CategorySlide = {
  type: "category";
  id: string;
  image: string;
  category: string;
  en: { title: string; subtitle: string };
  ar: { title: string; subtitle: string };
};

type HeroSlide = {
  type: "hero";
  id: "hero";
  image: string;
};

type Slide = HeroSlide | CategorySlide;

const content = {
  en: {
    heroTitle: "Premium Solutions for Your Car",
    shopNow: "Shop Now",
    explore: "Explore Collection",
    about: "Cesar Store delivers high-end automotive care and accessories, designed to elevate your driving experience with refined details.",
    banner: "Experience Excellence – Your Car Deserves the Best",
  },
  ar: {
    heroTitle: "حلول فاخرة لسيارتك",
    shopNow: "تسوق الآن",
    explore: "استكشف المجموعة",
    about: "يقدم متجر سيزر أرقى منتجات العناية بالسيارات والكماليات، المصممة لرفع مستوى تجربة القيادة الخاصة بك بلمسات راقية وأصلية.",
    banner: "اختبر التميز – سيارتك تستحق الأفضل دائماً",
  },
};

export default function LandingPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [index, setIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((categories) => {
        const heroSlide: HeroSlide = { type: "hero", id: "hero", image: "/slides/hero.jpg" };
        setSlides([heroSlide, ...categories]);
      })
      .catch(() => setSlides([{ type: "hero", id: "hero", image: "/slides/hero.jpg" }]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % slides.length), 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black text-gray-400">{isAr ? "سيزر ستور..." : "Cesar Store..."}</p>
    </div>
  );

  const slide = slides[index];
  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#FCFDFF]" dir={isAr ? "rtl" : "ltr"}>
      
      {/* Hero Slider Section */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={s.id + i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === index ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            {/* Image with Overlay */}
            <div className="absolute inset-0 bg-black/40 z-10" />
            <img 
              src={s.image} 
              alt="Slide" 
              className={`w-full h-full object-cover transition-transform duration-[7000ms] ${i === index ? "scale-110" : "scale-100"}`}
            />

            {/* Content Container */}
            <div className="absolute inset-0 z-20 flex items-center justify-center text-center px-6">
              <div className={`max-w-4xl transition-all duration-1000 ${i === index ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
                
                {s.type === "hero" ? (
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-white text-xs font-black uppercase tracking-[0.2em]">
                      <Sparkles size={14} className="text-blue-400" />
                      {isAr ? "مرحباً بك في عالم سيزر" : "Welcome to Cesar World"}
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-white leading-tight tracking-tighter">
                      {t.heroTitle}
                    </h1>
                    <Link href="/categories" className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl shadow-blue-600/30 active:scale-95">
                      {t.shopNow}
                      {isAr ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-4xl md:text-7xl font-black text-white">{isAr ? s.ar.title : s.en.title}</h2>
                    <p className="text-xl md:text-2xl text-white/80 font-bold">{isAr ? s.ar.subtitle : s.en.subtitle}</p>
                    <Link href={`/shop?category=${s.category}`} className="inline-block bg-white text-gray-900 px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95">
                      {t.explore}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Slider Indicators */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
          {slides.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setIndex(i)}
              className={`h-1.5 transition-all duration-500 rounded-full ${i === index ? "w-12 bg-blue-600" : "w-4 bg-white/30"}`} 
            />
          ))}
        </div>
      </section>

      {/* Features - إضافة قسم مميزات سريعة */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-gray-100">
        {[
          { icon: ShieldCheck, title: isAr ? "جودة مضمونة" : "Guaranteed Quality", desc: isAr ? "منتجات أصلية 100%" : "100% Original Products" },
          { icon: Zap, title: isAr ? "توصيل سريع" : "Fast Delivery", desc: isAr ? "شحن لجميع المحافظات" : "Shipping nationwide" },
          { icon: Sparkles, title: isAr ? "دعم متميز" : "Expert Support", desc: isAr ? "فريق جاهز لخدمتك" : "Team ready to help" },
        ].map((f, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-3 group">
            <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm shadow-blue-50">
              <f.icon size={30} />
            </div>
            <h3 className="font-black text-lg text-gray-900">{f.title}</h3>
            <p className="text-sm font-bold text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* About Section */}
      <section className="py-24 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
          {isAr ? "عن متجر سيزر" : "About CESAR"}
        </div>
        <p className="text-2xl md:text-3xl font-bold text-gray-800 leading-[1.6] tracking-tight italic">
          "{t.about}"
        </p>
      </section>

      {/* Bottom Banner */}
      <section className="mx-6 mb-20">
        <div className="max-w-7xl mx-auto bg-gray-900 rounded-[3rem] py-16 px-6 text-center relative overflow-hidden shadow-2xl shadow-gray-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -z-0"></div>
          <div className="relative z-10">
            <p className="text-2xl md:text-4xl font-black text-white mb-8 tracking-tighter">
              {t.banner}
            </p>
            <Link href="/shop" className="bg-white text-gray-900 px-12 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform inline-block">
              {isAr ? "ابدأ التسوق الآن" : "Start Shopping Now"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}