export type PromoPosition =
  | "categories_side"
  | "shop_left"
  | "shop_right";

export type PromoLocalizedText = {
  ar: string;
  en: string;
};

export type PromoCta = PromoLocalizedText & {
  link: string;
};

export type PromoData = {
  id: string;
  position: PromoPosition;
  isActive: boolean;
  productId?: string;
  image?: string;
  images: string[];
  title: PromoLocalizedText;
  description: PromoLocalizedText;
  cta: PromoCta;
  createdAt: string;
  updatedAt: string;
};

export const PROMO_POSITIONS: PromoPosition[] = [
  "categories_side",
  "shop_left",
  "shop_right",
];

export function createEmptyPromo(position: PromoPosition): PromoData {
  return {
    id: position,
    position,
    isActive: false,
    productId: "",
    image: "",
    images: [],
    title: {
      ar: "",
      en: "",
    },
    description: {
      ar: "",
      en: "",
    },
    cta: {
      ar: "",
      en: "",
      link: "",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
