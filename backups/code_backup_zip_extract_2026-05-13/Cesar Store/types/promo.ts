import type { Product } from "@/types/product";

export type PromoPosition =
  | "categories_side"
  | "categories_left"
  | "categories_right"
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
  selectedProductIds: string[];
  products: Product[];
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
  "categories_left",
  "categories_right",
  "shop_left",
  "shop_right",
];

export const MANAGED_PROMO_POSITIONS: PromoPosition[] = [
  "categories_left",
  "categories_right",
  "shop_left",
  "shop_right",
];

export function createEmptyPromo(position: PromoPosition): PromoData {
  return {
    id: position,
    position,
    isActive: false,
    productId: "",
    selectedProductIds: [],
    products: [],
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
