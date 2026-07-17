function normalizeSiteUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.replace(/\/+$/, ""));

    if (url.hostname === "cesareshop.com") {
      url.hostname = "www.cesareshop.com";
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return "https://www.cesareshop.com";
  }
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.cesareshop.com"
);

export const SITE_NAME = "Cesar Store";
export const SITE_NAME_AR = "متجر سيزر";
export const SITE_ALTERNATE_NAMES = [
  SITE_NAME,
  SITE_NAME_AR,
  "Cesar Shop",
  "Cesar Store Egypt",
  "Cesar Car Store",
  "cesareshop",
  "cesareshop.com",
  "سيزر ستور",
  "سيزر شوب",
  "موقع سيزر",
  "متجر Cesar",
  "متجر سيزر للسيارات",
];

export const BRAND_SEARCH_TERMS = [
  "Cesar Store",
  "Cesar Shop",
  "Cesar Store Egypt",
  "Cesar car accessories",
  "cesareshop",
  "cesareshop.com",
  "متجر سيزر",
  "سيزر ستور",
  "سيزر شوب",
  "موقع سيزر",
  "محل سيزر",
  "متجر سيزر للسيارات",
];

export const PRODUCT_SEARCH_TERMS = [
  "منتجات عناية بالسيارات",
  "منظفات سيارات",
  "ملمع سيارات",
  "معطرات سيارات",
  "معطر سيارات",
  "إكسسوارات سيارات",
  "اكسسوارات سيارات",
  "اكسسوارات عربيات",
  "متجر اكسسوارات سيارات",
  "شراء اكسسوارات سيارات اون لاين",
  "اكسسوارات سيارات في مصر",
  "أدوات سيارات",
  "إضاءة سيارات",
  "سوائل سيارات",
  "إضافات وقود",
  "شامبو سيارات",
  "شامبو واكس",
  "فوط ميكروفايبر للسيارات",
  "مياه مساحات",
  "كمبريسور سيارة",
  "منفاخ سيارة",
  "كابل بطارية",
  "كابل بطارية سيارة",
  "حامل موبايل سيارة",
  "غطاء سيارة",
  "مظلة سيارة",
  "مساحات سيارة",
  "car accessories Egypt",
  "car accessories online Egypt",
  "car care products Egypt",
  "car cleaning products Egypt",
  "car air fresheners Egypt",
  "car LED lights Egypt",
  "car tools Egypt",
  "windshield washer fluid Egypt",
  "microfiber towel car",
  "battery jumper cable",
  "tire air compressor",
];

export const DEFAULT_SEO_TITLE =
  "Cesar Store | متجر سيزر لمنتجات وإكسسوارات السيارات في مصر";

export const DEFAULT_SEO_DESCRIPTION =
  "متجر سيزر، Cesar Store أو Cesar Shop، يوفر منتجات العناية بالسيارات، معطرات، إكسسوارات، أدوات، إضاءة، سوائل، ومنظفات سيارات مختارة داخل مصر.";

export const DEFAULT_OG_IMAGE = "/logo-v2.png";

export const CONTACT_PHONE_DISPLAY = "01211120208";
export const CONTACT_PHONE_E164 = "+201211120208";
export const CONTACT_EMAIL = "Cesarstore365@gmail.com";
export const CONTACT_WHATSAPP_URL = "https://wa.me/201211120208";

function normalizeWhatsAppDigits(rawNumber: string) {
  const digits = rawNumber.replace(/\D/g, "");

  if (!digits) return "201211120208";
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `2${digits}`;

  return `20${digits}`;
}

export const WHOLESALE_WHATSAPP_NUMBER = normalizeWhatsAppDigits(
  process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER || CONTACT_PHONE_E164
);
export const WHOLESALE_WHATSAPP_URL = `https://wa.me/${WHOLESALE_WHATSAPP_NUMBER}`;

export const SOCIAL_PROFILES = {
  facebook: "https://www.facebook.com/share/18xg7Rwgfu/",
  instagram: "https://www.instagram.com/cesarstore3652026/",
  tiktok: "https://www.tiktok.com/@cesarstore365",
  youtube: "",
} as const;

export const SOCIAL_LINKS = Object.values(SOCIAL_PROFILES).filter(Boolean);

export const PUBLIC_CATEGORY_SEO = [
  {
    id: "air-fresheners",
    titleAr: "معطرات السيارات",
    titleEn: "Car air fresheners",
    guidePath: "/car-air-fresheners",
    shopPath: "/shop?category=air-fresheners",
    merchantProductType: "Car care > Car air fresheners",
    keywords: [
      "معطرات سيارات",
      "معطر سيارة",
      "معطر سيارات",
      "car air fresheners",
      "car scent",
      "car perfume",
    ],
  },
  {
    id: "detergent",
    titleAr: "تنظيف السيارات",
    titleEn: "Car cleaning products",
    guidePath: "/car-cleaning-products",
    shopPath: "/shop?category=detergent",
    merchantProductType: "Car care > Cleaning products",
    keywords: [
      "منظفات سيارات",
      "شامبو سيارات",
      "ملمع سيارات",
      "فوط مايكروفايبر",
      "car cleaning products",
      "car shampoo",
      "microfiber towel",
    ],
  },
  {
    id: "cars-accessories",
    titleAr: "إكسسوارات السيارات",
    titleEn: "Car accessories",
    guidePath: "/car-accessories",
    shopPath: "/shop?category=cars-accessories",
    merchantProductType: "Vehicles & Parts > Vehicle Parts & Accessories",
    keywords: [
      "إكسسوارات سيارات",
      "اكسسوارات سيارات",
      "اكسسوارات عربيات",
      "متجر اكسسوارات سيارات",
      "شراء اكسسوارات سيارات اون لاين",
      "اكسسوارات سيارات في مصر",
      "ملحقات سيارات",
      "حامل موبايل سيارة",
      "غطاء سيارة",
      "مظلة سيارة",
      "مساحات سيارات",
      "car accessories",
      "windshield wipers",
      "car accessories Egypt",
      "car accessories online Egypt",
    ],
  },
  {
    id: "cars-lights",
    titleAr: "إضاءة السيارات",
    titleEn: "Car lighting",
    guidePath: "/car-lighting-tools",
    shopPath: "/shop?category=cars-lights",
    merchantProductType: "Vehicles & Parts > Vehicle Lighting",
    keywords: [
      "إضاءة سيارات",
      "لمبات سيارات",
      "car LED lights",
      "vehicle lighting",
      "car lighting Egypt",
    ],
  },
  {
    id: "equipment",
    titleAr: "أدوات ومعدات السيارات",
    titleEn: "Car tools and equipment",
    guidePath: "/car-tools-equipment",
    shopPath: "/shop?category=equipment",
    merchantProductType: "Vehicles & Parts > Vehicle Tools & Equipment",
    keywords: [
      "أدوات سيارات",
      "معدات سيارات",
      "كمبريسور سيارة",
      "منفاخ سيارة",
      "كابل بطارية",
      "كابل بطارية سيارة",
      "car tools",
      "tire air compressor",
      "battery jumper cable",
    ],
  },
  {
    id: "additives-fluids",
    titleAr: "سوائل وإضافات السيارات",
    titleEn: "Car fluids and additives",
    guidePath: "/car-fluids-additives",
    shopPath: "/shop?category=additives-fluids",
    merchantProductType: "Vehicles & Parts > Vehicle Fluids",
    keywords: [
      "سوائل سيارات",
      "إضافات وقود",
      "مياه مساحات",
      "منظف رشاشات",
      "car fluids",
      "fuel additives",
      "windshield washer fluid",
    ],
  },
] as const;

export type PublicCategorySeo = (typeof PUBLIC_CATEGORY_SEO)[number];

function normalizeSeoCategory(input?: string) {
  if (!input) return "";

  const normalized = input.toLowerCase().trim().replace(/\s+/g, "-");
  const aliases: Record<string, string> = {
    "additives-&-fluids": "additives-fluids",
    "additives-and-fluids": "additives-fluids",
    "air-freshener": "air-fresheners",
    airfresheners: "air-fresheners",
    accessory: "cars-accessories",
    accessories: "cars-accessories",
    "car-accessories": "cars-accessories",
    "cars-light": "cars-lights",
    "car-lights": "cars-lights",
    lights: "cars-lights",
    "equipment-&-tools": "equipment",
    "equipment-and-tools": "equipment",
    tools: "equipment",
    detergents: "detergent",
  };

  return aliases[normalized] || normalized;
}

export function getCategorySeo(category?: string): PublicCategorySeo | null {
  const normalized = normalizeSeoCategory(category);

  return PUBLIC_CATEGORY_SEO.find((item) => item.id === normalized) || null;
}

export function absoluteUrl(pathOrUrl = "/") {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`, SITE_URL)
    .toString();
}

export function compactText(input: string, maxLength = 155) {
  const text = input.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1).trim()}…`;
}
