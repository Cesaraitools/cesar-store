"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowLeft, ArrowRight, Sparkles, ShieldCheck, Zap, ChevronRight, ChevronLeft, Store, FileCheck2 } from "lucide-react";

/* ---------------- Types (Unchanged) ---------------- */
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
  mobileImage: string;
};

type Slide = HeroSlide | CategorySlide;

const content = {
  en: {
    heroTitle: "Premium Solutions for Your Car",
    shopNow: "Shop Now",
    explore: "Explore Collection",
    about: "Cesar Store delivers high-end automotive care and accessories, designed to elevate your driving experience with refined details.",
    searchHint:
      "Customers can find us as Cesar Store, Cesar Shop, cesareshop.com, or by searching for car care products, air fresheners, accessories, lighting, tools, and car cleaning products in Egypt.",
    banner: "Experience Excellence – Your Car Deserves the Best",
    wholesaleEyebrow: "Wholesale Partners",
    wholesaleTitle: "Wholesale trade for shops, distributors, and companies",
    wholesaleDescription:
      "Apply as a wholesale partner, upload the required business documents, and after review you will get access to the wholesale catalog and private wholesale prices.",
    wholesalePrimary: "Enter wholesale section",
    wholesaleSecondary: "Apply as wholesale partner",
  },
  ar: {
    heroTitle: "حلول فاخرة لسيارتك",
    shopNow: "تسوق الآن",
    explore: "استكشف المجموعة",
    about: "يقدم متجر سيزر أرقى منتجات العناية بالسيارات والكماليات، المصممة لرفع مستوى تجربة القيادة الخاصة بك بلمسات راقية وأصلية.",
    searchHint:
      "يمكن الوصول إلى المتجر بصيغ مثل متجر سيزر، سيزر ستور، سيزر شوب، Cesar Store، Cesar Shop، أو عند البحث عن منتجات العناية بالسيارات والمعطرات والإكسسوارات والمنظفات.",
    banner: "اختبر التميز – سيارتك تستحق الأفضل دائماً",
    wholesaleEyebrow: "شركاء الجملة",
    wholesaleTitle: "قسم تجارة الجملة للمحلات والموزعين والشركات",
    wholesaleDescription:
      "قدّم طلب الانضمام كتاجر جملة، ارفع المستندات المطلوبة، وبعد المراجعة تظهر لك أسعار الجملة والكتالوج المخصص.",
    wholesalePrimary: "دخول قسم الجملة",
    wholesaleSecondary: "تقديم طلب تاجر جملة",
  },
};

const heroSlide: HeroSlide = {
  type: "hero",
  id: "hero",
  image: "/slides/hero.jpg",
  mobileImage: "/slides/hero-mobile.jpg",
};

function scheduleAfterInitialPaint(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const id = idleWindow.requestIdleCallback(callback, { timeout: 2500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, 1200);
  return () => window.clearTimeout(id);
}

function scheduleAfterPageLoad(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  let cancelIdleWork = () => {};
  const scheduleIdleWork = () => {
    cancelIdleWork = scheduleAfterInitialPaint(callback);
  };

  if (document.readyState === "complete") {
    scheduleIdleWork();
  } else {
    window.addEventListener("load", scheduleIdleWork, { once: true });
  }

  return () => {
    window.removeEventListener("load", scheduleIdleWork);
    cancelIdleWork();
  };
}

type SiteLanguage = keyof typeof content;

function HeroCarousel({ lang }: { lang: SiteLanguage }) {
  const isAr = lang === "ar";
  const t = content[lang];
  const [index, setIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([heroSlide]);
  const [hasChangedSlide, setHasChangedSlide] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadCategories = () => {
      fetch("/api/categories", { cache: "no-store" })
        .then((response) => response.json())
        .then((categories: CategorySlide[]) => {
          if (isCancelled) return;

          setSlides([heroSlide, ...categories]);
        })
        .catch(() => {
          if (isCancelled) return;
          setSlides([heroSlide]);
        });
    };

    const cancelDeferredLoad = scheduleAfterPageLoad(loadCategories);

    return () => {
      isCancelled = true;
      cancelDeferredLoad();
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || autoPlayEnabled) return;

    const enableAutoPlay = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setAutoPlayEnabled(true);
    };

    window.addEventListener("pointerdown", enableAutoPlay, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", enableAutoPlay, { once: true });

    return () => {
      window.removeEventListener("pointerdown", enableAutoPlay);
      window.removeEventListener("keydown", enableAutoPlay);
    };
  }, [autoPlayEnabled, slides.length]);

  useEffect(() => {
    if (!autoPlayEnabled || slides.length <= 1) return;

    const nextSlide = slides[(index + 1) % slides.length];
    const image = new window.Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src =
      nextSlide.type === "hero" && window.matchMedia("(max-width: 767px)").matches
        ? nextSlide.mobileImage
        : nextSlide.image;
  }, [autoPlayEnabled, index, slides]);

  useEffect(() => {
    if (!autoPlayEnabled || slides.length <= 1) return;

    const timer = window.setInterval(
      () => {
        setHasChangedSlide(true);
        setIndex((previous) => (previous + 1) % slides.length);
      },
      7000
    );
    return () => window.clearInterval(timer);
  }, [autoPlayEnabled, slides.length]);

  const activeSlide = slides[index] ?? heroSlide;
  const getSlideAlt = (slide: Slide) =>
    slide.type === "hero"
      ? isAr
        ? "واجهة متجر سيزر لمنتجات وإكسسوارات السيارات"
        : "Cesar Store automotive products and accessories"
      : isAr
      ? slide.ar.title
      : slide.en.title;

  return (
    <section className="relative h-[80vh] w-full overflow-hidden bg-slate-900 md:h-[90vh]">
      <div
        key={`${activeSlide.id}-${index}`}
        className={`${
          hasChangedSlide ? "homepage-slide-enter " : ""
        }absolute inset-0 z-10`}
      >
        <div
          className="absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-black/10 to-black/40"
          aria-hidden="true"
        />
        <picture className="absolute inset-0">
          {activeSlide.type === "hero" ? (
            <source media="(max-width: 767px)" srcSet={activeSlide.mobileImage} />
          ) : null}
          <Image
            src={activeSlide.image}
            alt={getSlideAlt(activeSlide)}
            fill
            fetchPriority={
              index === 0 && activeSlide.type === "hero" ? "high" : "auto"
            }
            loading={
              index === 0 && activeSlide.type === "hero" ? "eager" : "lazy"
            }
            sizes="100vw"
            quality={75}
            className={`${
              hasChangedSlide ? "homepage-slide-image " : ""
            }h-full w-full object-cover`}
          />
        </picture>

        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center">
          <div
            className={`${
              hasChangedSlide ? "homepage-slide-copy " : ""
            }max-w-5xl`}
          >
            {activeSlide.type === "hero" ? (
              <div className="space-y-6 md:space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-xl md:text-xs">
                  <Sparkles size={14} className="text-blue-400" />
                  {isAr ? "مرحباً بك في عالم سيزر" : "Welcome to Cesar World"}
                </div>
                <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white md:text-8xl">
                  {t.heroTitle.split(" ").map((word, wordIndex) => (
                    <span
                      key={wordIndex}
                      className={wordIndex === 1 ? "text-blue-500" : ""}
                    >
                      {word}{" "}
                    </span>
                  ))}
                </h1>
                <Link
                  href="/categories"
                  prefetch={false}
                  className="group relative inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-black text-white transition-all hover:bg-blue-700 hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 md:px-12 md:py-6"
                >
                  {t.shopNow}
                  <span className="transition-transform group-hover:translate-x-1">
                    {isAr ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-4xl font-black text-white drop-shadow-2xl md:text-7xl">
                  {isAr ? activeSlide.ar.title : activeSlide.en.title}
                </h2>
                <p className="mx-auto max-w-2xl text-lg font-medium text-white/90 md:text-2xl">
                  {isAr ? activeSlide.ar.subtitle : activeSlide.en.subtitle}
                </p>
                <Link
                  href={`/shop?category=${activeSlide.category}`}
                  prefetch={false}
                  className="inline-block rounded-2xl bg-white px-10 py-5 text-lg font-black text-slate-900 shadow-2xl transition-all hover:bg-blue-50 active:scale-95"
                >
                  {t.explore}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => {
              setHasChangedSlide(true);
              setIndex(slideIndex);
            }}
            aria-label={
              isAr
                ? `عرض الشريحة ${slideIndex + 1}`
                : `Show slide ${slideIndex + 1}`
            }
            aria-current={slideIndex === index ? "true" : undefined}
            className="flex h-11 min-w-11 items-center justify-center rounded-full"
          >
            <span
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                slideIndex === index ? "w-10 bg-blue-600" : "w-2 bg-white/40"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir={isAr ? "rtl" : "ltr"}>
      <link
        rel="preload"
        as="image"
        href={heroSlide.mobileImage}
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={heroSlide.image}
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      
      <HeroCarousel lang={lang} />

      {/* Features - تحسين الظلال والرموز */}
      <section className="py-24 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <h2 className="sr-only">
          {isAr ? "مميزات متجر سيزر" : "Why choose Cesar Store"}
        </h2>
        {[
          { icon: ShieldCheck, title: isAr ? "جودة مضمونة" : "Guaranteed Quality", desc: isAr ? "منتجات أصلية 100% ومختارة بعناية" : "100% Original handpicked products" },
          { icon: Zap, title: isAr ? "توصيل سريع" : "Fast Delivery", desc: isAr ? "شحن آمن لجميع محافظات مصر" : "Safe shipping across Egypt" },
          { icon: Sparkles, title: isAr ? "دعم متميز" : "Expert Support", desc: isAr ? "فريق فني متخصص لخدمتكم" : "Technical team at your service" },
        ].map((f, i) => (
          <div key={i} className="relative p-8 bg-white border border-slate-100 rounded-[2rem] flex flex-col items-center text-center space-y-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-[10deg] transition-all duration-500">
              <f.icon size={32} />
            </div>
            <h3 className="font-black text-xl text-slate-900">{f.title}</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 md:grid-cols-[1.1fr_0.9fr] md:p-12">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              <Store size={16} />
              {t.wholesaleEyebrow}
            </span>
            <h2 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              {t.wholesaleTitle}
            </h2>
            <p className="max-w-2xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
              {t.wholesaleDescription}
            </p>
          </div>

          <div className="grid gap-4">
            <Link
              href="/wholesale"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              <Store size={20} />
              {t.wholesalePrimary}
            </Link>
            <Link
              href="/wholesale/apply"
              className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm font-black text-slate-900 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <FileCheck2 size={20} />
              {t.wholesaleSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - Minimalist approach */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-blue-600 font-black text-[20px] uppercase tracking-[0.3em] mb-4 block">
            {isAr ? "قصتنا" : "OUR STORY"}
          </span>
          <p className="text-2xl md:text-4xl font-bold text-slate-800 leading-tight tracking-tight">
            {t.about}
          </p>
          <p className="mx-auto mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-500 md:text-lg">
            {t.searchHint}
          </p>
          <Link
            href="/search-guide"
            className="mt-8 inline-flex rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700"
          >
            {isAr ? "دليل البحث عن سيزر" : "Cesar search guide"}
          </Link>
        </div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-50/50 font-black text-[15rem] -z-0 select-none"
          aria-hidden="true"
        >
          CESAR
        </div>
      </section>

      {/* Bottom Banner - High Impact */}
      <section className="px-6 mb-24">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[3.5rem] py-20 px-10 text-center relative overflow-hidden">
          {/* Decorative Elements */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"
            aria-hidden="true"
          ></div>
          <div
            className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"
            aria-hidden="true"
          ></div>
          
          <div className="relative z-10 space-y-10">
            <h2 className="text-3xl md:text-5xl font-black text-white max-w-3xl mx-auto leading-tight">
              {t.banner}
            </h2>
            <Link href="/shop" className="inline-flex items-center gap-3 bg-white text-slate-900 px-14 py-5 rounded-2xl font-black text-base hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:-translate-y-1">
              {isAr ? "ابدأ التسوق الآن" : "Start Shopping Now"}
              {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
