"use client";

type Language = "ar" | "en";

interface PromoData {
  image?: string;
  title: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
}

interface Props {
  promo: PromoData;
  lang: Language;
}

export default function SidePromoCard({ promo, lang }: Props) {
  if (!promo) return null;

  return (
    <div
      className="relative rounded-2xl text-white p-6 flex flex-col justify-center min-h-[420px] shadow-lg overflow-hidden"
      style={{
        backgroundImage: promo.image
          ? `url(${promo.image})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-3">
          {promo.title[lang]}
        </h3>

        <p className="text-sm opacity-90 leading-relaxed">
          {promo.description[lang]}
        </p>
      </div>
    </div>
  );
}