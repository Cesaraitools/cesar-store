"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import OrbitLandingHero from "@/components/landing/OrbitLandingHero";
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

const CATEGORY_FALLBACK_DELAY_MS = 12_000;

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
    let loadStarted = false;
    const interactionEvents = ["pointerdown", "keydown", "touchstart"] as const;

    const loadCategories = (advanceOnLoad: boolean) => {
      if (loadStarted) return;
      loadStarted = true;

      fetch("/api/categories", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Categories request failed: ${response.status}`);
          }

          return response.json();
        })
        .then((categories: CategorySlide[]) => {
          if (isCancelled) return;

          setSlides([heroSlide, ...categories]);

          if (
            categories.length > 0 &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            setAutoPlayEnabled(true);

            if (advanceOnLoad) {
              setHasChangedSlide(true);
              setIndex(1);
            }
          }
        })
        .catch(() => {
          if (isCancelled) return;
          setSlides([heroSlide]);
        });
    };

    function removeInteractionListeners() {
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, loadAfterInteraction)
      );
    }

    function loadAfterInteraction() {
      removeInteractionListeners();
      loadCategories(false);
    }

    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, loadAfterInteraction, {
        once: true,
        passive: true,
      })
    );
    const fallbackTimer = window.setTimeout(() => {
      loadCategories(true);
    }, CATEGORY_FALLBACK_DELAY_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(fallbackTimer);
      removeInteractionListeners();
    };
  }, []);

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
      <OrbitLandingHero lang={lang} />

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

      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl items-center gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
              <Store size={14} />
              {t.wholesaleEyebrow}
            </span>
            <h2 className="text-2xl font-black leading-tight text-slate-950 md:text-3xl">
              {t.wholesaleTitle}
            </h2>
            <p className="max-w-2xl text-sm font-semibold leading-7 text-slate-600 md:text-base">
              {t.wholesaleDescription}
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              href="/wholesale"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-700"
            >
              <Store size={16} />
              {t.wholesalePrimary}
            </Link>
            <Link
              href="/wholesale/apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-slate-900 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <FileCheck2 size={16} />
              {t.wholesaleSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - Minimalist approach */}
      <section className="relative overflow-hidden px-6 py-16">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="mb-3 block text-sm font-black uppercase tracking-[0.24em] text-blue-600 md:text-base">
            {isAr ? "قصتنا" : "OUR STORY"}
          </span>
          <p className="text-xl font-bold leading-snug tracking-tight text-slate-800 md:text-2xl">
            {t.about}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
            {t.searchHint}
          </p>
          <Link
            href="/search-guide"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
          >
            {isAr ? "دليل البحث عن سيزر" : "Cesar search guide"}
          </Link>
        </div>
        <div
          className="absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 select-none text-[10rem] font-black text-slate-50/50"
          aria-hidden="true"
        >
          CESAR
        </div>
      </section>

      {/* Bottom Banner - High Impact */}
      <section className="mb-16 px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-12 text-center">
          {/* Decorative Elements */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"
            aria-hidden="true"
          ></div>
          <div
            className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"
            aria-hidden="true"
          ></div>
          
          <div className="relative z-10 space-y-6">
            <h2 className="mx-auto max-w-2xl text-2xl font-black leading-tight text-white md:text-3xl">
              {t.banner}
            </h2>
            <Link href="/shop" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-black text-slate-900 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(255,255,255,0.18)]">
              {isAr ? "ابدأ التسوق الآن" : "Start Shopping Now"}
              {isAr ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
