"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

type CategorySlide = {
  type: "category";
  id: string;
  image: string;
  category: string;
  en: {
    title: string;
    subtitle: string;
  };
  ar: {
    title: string;
    subtitle: string;
  };
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  category: CategorySlide;
};

export default function CategoryCard({ category }: Props) {
  const { lang } = useLanguage();

  const title = lang === "ar" ? category.ar.title : category.en.title;
  const subtitle =
    lang === "ar" ? category.ar.subtitle : category.en.subtitle;
  const cta = lang === "ar" ? "استعرض المنتجات" : "View Products";

  return (
    <Link
      href={`/shop?category=${category.category}`}
      className="group relative h-72 overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${category.image})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10 group-hover:from-black/80 transition" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-end text-center text-white px-6 pb-6">
        <h3 className="text-2xl font-bold mb-1">{title}</h3>
        <p className="text-sm opacity-90 mb-4">{subtitle}</p>

        <span className="inline-block rounded-full bg-sky-400 px-6 py-2 text-sm font-semibold shadow-md group-hover:bg-sky-500 transition">
          {cta}
        </span>
      </div>
    </Link>
  );
}