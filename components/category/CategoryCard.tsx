"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeCategory } from "@/lib/category-normalizer";

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

const categoryThemes: Record<
  string,
  {
    glow: string;
    button: string;
    ring: string;
  }
> = {
  "additives-fluids": {
    glow: "from-cyan-300/75 via-emerald-200/45 to-blue-300/65",
    button: "bg-cyan-50 text-cyan-950 hover:bg-white",
    ring: "ring-cyan-200/80",
  },
  detergent: {
    glow: "from-sky-300/65 via-teal-200/50 to-slate-200/70",
    button: "bg-sky-50 text-sky-950 hover:bg-white",
    ring: "ring-sky-200/80",
  },
  "cars-accessories": {
    glow: "from-amber-200/75 via-orange-100/60 to-yellow-300/65",
    button: "bg-amber-50 text-amber-950 hover:bg-white",
    ring: "ring-amber-200/80",
  },
  "air-fresheners": {
    glow: "from-lime-200/75 via-emerald-100/60 to-green-300/65",
    button: "bg-lime-50 text-lime-950 hover:bg-white",
    ring: "ring-lime-200/80",
  },
  equipment: {
    glow: "from-violet-300/65 via-fuchsia-100/55 to-slate-200/70",
    button: "bg-violet-50 text-violet-950 hover:bg-white",
    ring: "ring-violet-200/80",
  },
  "cars-lights": {
    glow: "from-rose-300/75 via-red-100/55 to-slate-900/45",
    button: "bg-rose-50 text-rose-950 hover:bg-white",
    ring: "ring-rose-200/80",
  },
};

const fallbackTheme = {
  glow: "from-slate-200/75 via-blue-100/55 to-cyan-200/60",
  button: "bg-white text-slate-950 hover:bg-slate-50",
  ring: "ring-slate-200/80",
};

export default function CategoryCard({ category }: Props) {
  const { lang } = useLanguage();
  const theme = categoryThemes[normalizeCategory(category.category)] ?? fallbackTheme;

  const title = lang === "ar" ? category.ar.title : category.en.title;
  const subtitle =
    lang === "ar" ? category.ar.subtitle : category.en.subtitle;
  const cta = lang === "ar" ? "استعرض المنتجات" : "View Products";

  return (
    <Link
      href={`/shop?category=${category.category}`}
      className={`group/category relative block h-full min-h-72 overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-slate-200/60 ring-1 ${theme.ring} transition duration-500 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
    >
      <div
        className={`absolute -inset-6 bg-gradient-to-br ${theme.glow} opacity-0 blur-2xl transition duration-500 group-hover/category:opacity-100`}
        aria-hidden="true"
      />

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/category:scale-110"
        style={{ backgroundImage: `url(${category.image})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/38 to-black/5 transition group-hover/category:from-black/82" />
      <div className="absolute inset-x-4 top-4 h-16 rounded-full bg-white/18 blur-2xl" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-end px-5 pb-6 text-center text-white">
        <h3 className="mb-1 text-2xl font-black leading-tight drop-shadow-sm">{title}</h3>
        <p className="mb-4 line-clamp-2 text-sm font-semibold leading-relaxed text-white/90">
          {subtitle}
        </p>

        <span
          className={`inline-flex min-h-10 items-center justify-center rounded-full px-6 py-2 text-sm font-black shadow-xl shadow-black/15 transition active:scale-95 ${theme.button}`}
        >
          {cta}
        </span>
      </div>
    </Link>
  );
}
