export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://cesareshop.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Cesar Store";
export const SITE_NAME_AR = "متجر سيزر";

export const DEFAULT_SEO_TITLE =
  "Cesar Store | متجر سيزر لمنتجات وإكسسوارات السيارات في مصر";

export const DEFAULT_SEO_DESCRIPTION =
  "متجر سيزر يوفر منتجات العناية بالسيارات، معطرات، إكسسوارات، أدوات، ومنظفات سيارات مختارة بعناية داخل مصر.";

export const DEFAULT_OG_IMAGE = "/logo-v2.png";

export const SOCIAL_LINKS = [
  "https://www.tiktok.com/@cesarstore365",
  "https://www.instagram.com/cesarstore3652026/",
  "https://www.facebook.com/share/18xg7Rwgfu/",
];

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
