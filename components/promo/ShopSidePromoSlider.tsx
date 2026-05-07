"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSafeImage } from "@/lib/image-safe";
import type { PromoData } from "@/types/promo";

type Props = {
  promo: PromoData;
  lang: "ar" | "en";
};

type PromoSlide = {
  id: string;
  image: string;
  title: string;
  description: string;
  href: string;
  price?: number;
};

export default function ShopSidePromoSlider({ promo, lang }: Props) {
  const slides = useMemo<PromoSlide[]>(() => {
    if (promo.products.length) {
      return promo.products
        .filter((product) => product.images.length > 0)
        .map((product) => ({
          id: product.id,
          image: getSafeImage(product.images[0]),
          title: lang === "ar" ? product.name.ar : product.name.en,
          description:
            lang === "ar"
              ? product.description.ar
              : product.description.en,
          href: `/product/${product.id}`,
          price: product.price,
        }));
    }

    const promoImages = Array.isArray(promo.images) ? promo.images : [];
    const fallbackImage = promo.image ? [promo.image] : [];
    const sourceImages = promoImages.length ? promoImages : fallbackImage;

    return sourceImages.map((image, index) => ({
      id: `${promo.id}-${index}`,
      image: getSafeImage(image),
      title: lang === "ar" ? promo.title.ar : promo.title.en,
      description: lang === "ar" ? promo.description.ar : promo.description.en,
      href: promo.cta.link || "/shop",
    }));
  }, [lang, promo]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [promo.id, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!promo.isActive || !slides.length) {
    return null;
  }

  const activeSlide = slides[activeIndex];
  const ctaLabel =
    promo.products.length > 0
      ? lang === "ar"
        ? "عرض المنتج"
        : "View Product"
      : lang === "ar"
      ? promo.cta.ar || "تسوق الآن"
      : promo.cta.en || "Shop now";

  return (
    <aside className="group relative xl:sticky xl:top-32">
      <div className="pointer-events-none absolute inset-x-5 -bottom-7 h-16 rounded-full bg-slate-900/12 blur-2xl transition-all duration-500 group-hover:bg-slate-900/18" />
      <div className="pointer-events-none absolute -inset-x-2 -top-3 h-24 rounded-[2.5rem] bg-white/55 blur-2xl" />
      <div className="absolute inset-0 rounded-[2.7rem] bg-gradient-to-b from-white/40 via-white/10 to-transparent opacity-70" />

      <div className="relative min-h-[560px] overflow-hidden rounded-[2.5rem] border border-white/45 bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.12),0_38px_90px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/5 transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_24px_48px_rgba(15,23,42,0.16),0_46px_110px_rgba(15,23,42,0.24)]">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={`${slide.id}-${index}`}
              className={`absolute inset-0 transition-all duration-1000 ease-out ${
                index === activeIndex
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-105"
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-950/20 to-slate-950/85" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]" />
        <div className="absolute inset-x-8 top-4 h-px bg-white/40" />
        <div className="absolute right-4 top-4 h-14 w-14 rounded-full border border-white/15 bg-white/10 blur-[1px]" />
        <div className="absolute left-5 top-5 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 flex min-h-[560px] flex-col justify-between p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-white/80 backdrop-blur-sm">
              Promo
            </span>

            {slides.length > 1 && (
              <div className="flex items-center gap-1.5">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      index === activeIndex
                        ? "w-10 bg-blue-500"
                        : "w-2 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-5 flex gap-2">
              {slides.slice(0, 3).map((slide, index) => (
                <button
                  key={`${slide.id}-thumb`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    index === activeIndex
                      ? "border-white/80 shadow-lg"
                      : "border-white/20 opacity-80"
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-14 w-12 object-cover"
                  />
                </button>
              ))}
            </div>

            <h3 className="max-w-[14rem] text-3xl font-black leading-tight">
              {activeSlide.title || "Featured collection"}
            </h3>

            <p className="mt-4 max-w-[15rem] text-sm leading-6 text-white/80 line-clamp-4">
              {activeSlide.description ||
                "Showcase selected products in a modern rotating ad block."}
            </p>

            {typeof activeSlide.price === "number" && (
              <p className="mt-4 text-sm font-black text-emerald-300">
                {activeSlide.price} {lang === "ar" ? "جنيه" : "EGP"}
              </p>
            )}

            <Link
              href={activeSlide.href}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[0_12px_24px_rgba(255,255,255,0.18)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {ctaLabel}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
