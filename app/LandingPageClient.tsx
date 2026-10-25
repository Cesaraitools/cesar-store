"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import OrbitLandingHero from "@/components/landing/OrbitLandingHero";
import { useLanguage } from "@/context/LanguageContext";
import type { LandingShowcase } from "@/lib/landing-showcase";

const content = {
  en: {
    about:
      "Cesar Store delivers high-end automotive care and accessories, designed to elevate your driving experience with refined details.",
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
    about:
      "يقدم متجر سيزر أرقى منتجات العناية بالسيارات والكماليات، المصممة لرفع مستوى تجربة القيادة الخاصة بك بلمسات راقية وأصلية.",
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

type LandingPageClientProps = {
  initialShowcase: LandingShowcase;
};

export default function LandingPageClient({
  initialShowcase,
}: LandingPageClientProps) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir={isAr ? "rtl" : "ltr"}>
      <OrbitLandingHero lang={lang} initialShowcase={initialShowcase} />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-24 md:grid-cols-3">
        <h2 className="sr-only">
          {isAr ? "مميزات متجر سيزر" : "Why choose Cesar Store"}
        </h2>
        {[
          {
            icon: ShieldCheck,
            title: isAr ? "جودة مضمونة" : "Guaranteed Quality",
            desc: isAr
              ? "منتجات أصلية 100% ومختارة بعناية"
              : "100% Original handpicked products",
          },
          {
            icon: Zap,
            title: isAr ? "توصيل سريع" : "Fast Delivery",
            desc: isAr
              ? "شحن آمن لجميع محافظات مصر"
              : "Safe shipping across Egypt",
          },
          {
            icon: Sparkles,
            title: isAr ? "دعم متميز" : "Expert Support",
            desc: isAr
              ? "فريق فني متخصص لخدمتكم"
              : "Technical team at your service",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="group relative flex flex-col items-center space-y-4 rounded-[2rem] border border-slate-100 bg-white p-8 text-center transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 transition-all duration-500 group-hover:rotate-[10deg] group-hover:bg-blue-600 group-hover:text-white">
              <feature.icon size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              {feature.title}
            </h3>
            <p className="text-sm font-medium leading-relaxed text-slate-500">
              {feature.desc}
            </p>
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

      <section className="mb-16 px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-12 text-center">
          <div
            className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 h-[300px] w-[300px] -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-500/10 blur-[100px]"
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            <h2 className="mx-auto max-w-2xl text-2xl font-black leading-tight text-white md:text-3xl">
              {t.banner}
            </h2>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-black text-slate-900 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(255,255,255,0.18)]"
            >
              {isAr ? "ابدأ التسوق الآن" : "Start Shopping Now"}
              {isAr ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
