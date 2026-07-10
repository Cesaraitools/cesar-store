import { getActiveProducts } from "@/lib/server/catalog";
import { SITE_URL } from "@/lib/seo";

export const INDEXNOW_KEY = "0f4bc9d8b1d94db1a6f6e3a71957c8d2";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_MAX_URLS = 10000;

const PUBLIC_INDEXNOW_PATHS = [
  "/",
  "/shop",
  "/categories",
  "/wholesale",
  "/about",
  "/contact",
  "/shipping",
  "/ordering-guide",
  "/car-care",
  "/car-air-fresheners",
  "/car-cleaning-products",
  "/car-accessories",
  "/car-lighting-tools",
  "/car-tools-equipment",
  "/car-fluids-additives",
  "/return-policy",
  "/faq",
  "/search-guide",
  "/sitemap.xml",
];

export function indexNowSiteOrigin() {
  return new URL(SITE_URL).origin.replace(/\/+$/, "");
}

export function normalizeIndexNowUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const origin = indexNowSiteOrigin();
    const url = new URL(value.trim(), origin);
    const siteHost = new URL(origin).hostname.replace(/^www\./, "");
    const urlHost = url.hostname.replace(/^www\./, "");

    if (siteHost !== urlHost) return null;

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeIndexNowUrls(values: unknown) {
  const input = Array.isArray(values) ? values : typeof values === "string" ? [values] : [];
  const urls = input.map(normalizeIndexNowUrl).filter(Boolean) as string[];

  return Array.from(new Set(urls)).slice(0, INDEXNOW_MAX_URLS);
}

export async function getDefaultIndexNowUrls() {
  const origin = indexNowSiteOrigin();
  const staticUrls = PUBLIC_INDEXNOW_PATHS.map((path) => new URL(path, origin).toString());
  const products = await getActiveProducts(INDEXNOW_MAX_URLS - staticUrls.length);
  const productUrls = products.map((product) => new URL(`/product/${product.id}`, origin).toString());

  return Array.from(new Set([...staticUrls, ...productUrls])).slice(0, INDEXNOW_MAX_URLS);
}

export async function submitIndexNowUrls(urls: string[]) {
  const origin = indexNowSiteOrigin();
  const { hostname } = new URL(origin);
  const payload = {
    host: hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    responseText,
  };
}
