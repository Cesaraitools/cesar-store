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
  "معطرات سيارات",
  "إكسسوارات سيارات",
  "أدوات سيارات",
  "إضاءة سيارات",
  "سوائل سيارات",
  "إضافات وقود",
  "شامبو سيارات",
  "شامبو واكس",
  "فوط ميكروفايبر للسيارات",
  "مياه مساحات",
  "كمبريسور سيارة",
  "كابل بطارية",
  "مساحات سيارة",
  "car accessories Egypt",
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

export const SOCIAL_PROFILES = {
  facebook: "https://www.facebook.com/share/18xg7Rwgfu/",
  instagram: "https://www.instagram.com/cesarstore3652026/",
  tiktok: "https://www.tiktok.com/@cesarstore365",
  youtube: "",
} as const;

export const SOCIAL_LINKS = Object.values(SOCIAL_PROFILES).filter(Boolean);

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
