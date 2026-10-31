"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Headphones,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import OrbitLandingHero from "@/components/landing/OrbitLandingHero";
import { useLanguage } from "@/context/LanguageContext";
import {
  DELIVERY_NOTICE_AR,
  DELIVERY_NOTICE_EN,
} from "@/lib/delivery-governorates";
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
    <div className="min-h-screen bg-[#F7F8FC]" dir={isAr ? "rtl" : "ltr"}>
      <OrbitLandingHero lang={lang} initialShowcase={initialShowcase} />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-20 md:grid-cols-3">
        <h2 className="sr-only">
          {isAr ? "مميزات متجر سيزر" : "Why choose Cesar Store"}
        </h2>
        {[
          {
            icon: Truck,
            title: isAr ? "توصيل سريع" : "Fast Delivery",
            desc: isAr ? DELIVERY_NOTICE_AR : DELIVERY_NOTICE_EN,
            cardClass: "bg-[#3448E5]",
            iconClass: "bg-white/15 text-[#FFE35B]",
          },
          {
            icon: ShieldCheck,
            title: isAr ? "جودة مضمونة" : "Guaranteed Quality",
            desc: isAr
              ? "منتجات أصلية 100% ومختارة بعناية"
              : "100% Original handpicked products",
            cardClass: "bg-[#182338]",
            iconClass: "bg-[#6B4E10]/70 text-[#FFC928]",
          },
          {
            icon: Headphones,
            title: isAr ? "دعم متميز" : "Expert Support",
            desc: isAr
              ? "فريق فني متخصص لخدمتكم"
              : "Technical team at your service",
            cardClass: "bg-[#FF7800]",
            iconClass: "bg-white/20 text-white",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className={`group relative min-h-[172px] overflow-hidden rounded-[1.75rem] px-7 py-7 text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.7)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_-26px_rgba(15,23,42,0.7)] ${feature.cardClass}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 ${feature.iconClass}`}
              >
                <feature.icon size={28} strokeWidth={2.25} />
              </div>
              <div className="pt-1 text-start">
                <h3 className="text-xl font-black leading-snug md:text-2xl">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/90">
                  {feature.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl items-center gap-8 rounded-[2rem] bg-[#182338] p-7 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.78)] md:grid-cols-[1.1fr_0.9fr] md:p-9">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#FFD23F]">
              <Store size={14} />
              {t.wholesaleEyebrow}
            </span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
              {t.wholesaleTitle}
            </h2>
            <p className="max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
              {t.wholesaleDescription}
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              href="/wholesale"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF7800] px-5 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-[#E96E00]"
            >
              <Store size={16} />
              {t.wholesalePrimary}
            </Link>
            <Link
              href="/wholesale/apply"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FileCheck2 size={16} />
              {t.wholesaleSecondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#3448E5] px-7 py-10 text-center text-white shadow-[0_24px_60px_-34px_rgba(52,72,229,0.75)] md:px-12 md:py-12">
          <span className="mb-3 block text-xs font-black uppercase tracking-[0.24em] text-[#FFE35B] md:text-sm">
            {isAr ? "قصتنا" : "OUR STORY"}
          </span>
          <p className="mx-auto max-w-3xl text-xl font-black leading-snug tracking-tight md:text-2xl">
            {t.about}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/80 md:text-base">
            {t.searchHint}
          </p>
          <Link
            href="/search-guide"
            className="mt-6 inline-flex rounded-2xl bg-white px-6 py-3 text-xs font-black text-[#182338] shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-[#FFF4D7]"
          >
            {isAr ? "دليل البحث عن سيزر" : "Cesar search guide"}
          </Link>
        </div>
      </section>

      <section className="mb-16 px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#FF7800] px-8 py-11 text-center text-white shadow-[0_24px_60px_-34px_rgba(234,88,12,0.78)]">
          <div className="space-y-6">
            <h2 className="mx-auto max-w-2xl text-2xl font-black leading-tight text-white md:text-3xl">
              {t.banner}
            </h2>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-black text-[#182338] shadow-lg shadow-orange-950/20 transition-all hover:-translate-y-0.5 hover:bg-[#FFF4D7]"
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
