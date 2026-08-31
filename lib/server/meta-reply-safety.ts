export type MetaReplySafetyResult =
  | { safe: true; reason: "ok" }
  | {
      safe: false;
      reason: "empty_reply" | "public_price_detected" | "unapproved_url";
    };

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

function normalizeUrl(value: string) {
  const trimmed = value.replace(/[.,،؛:!?\])}]+$/g, "");

  try {
    const url = new URL(trimmed);
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

function extractUrls(value: string) {
  return (value.match(URL_PATTERN) || []).map(normalizeUrl);
}

function containsPublicPrice(value: string) {
  const arabicCurrency = /(?:جنيه(?:اً|ا)?|ج\.?\s*م\.?)/u;
  const latinCurrency = /\b(?:egp|usd|eur|sar|aed|l\.?\s*e\.?)\b/iu;
  const currencySymbol = /[$€£¥]/u;
  const priceWithNumber =
    /(?:السعر|سعر|price|cost)\s*(?::|-)?\s*(?:هو\s*)?[\d٠-٩]/iu;

  return (
    arabicCurrency.test(value) ||
    latinCurrency.test(value) ||
    currencySymbol.test(value) ||
    priceWithNumber.test(value)
  );
}

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/٬/g, ",")
    .replace(/٫/g, ".");
}

function containsKnownPrice(value: string, forbiddenPrices: number[]) {
  const textWithoutUrls = normalizeDigits(value.replace(URL_PATTERN, " "));

  return forbiddenPrices.some((price) => {
    if (!Number.isFinite(price) || price <= 0) return false;

    const variants = new Set([
      String(price),
      price.toFixed(2),
      price.toLocaleString("en-US", { maximumFractionDigits: 2 }),
    ]);

    return Array.from(variants).some((variant) => {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^\\d])${escaped}(?=$|[^\\d])`, "u").test(
        textWithoutUrls
      );
    });
  });
}

export function validateMetaPublicReply(
  reply: string,
  allowedUrls: string[] = [],
  forbiddenPrices: number[] = []
): MetaReplySafetyResult {
  const text = reply.trim();
  if (!text) return { safe: false, reason: "empty_reply" };

  if (containsPublicPrice(text) || containsKnownPrice(text, forbiddenPrices)) {
    return { safe: false, reason: "public_price_detected" };
  }

  const allowed = new Set(allowedUrls.filter(Boolean).map(normalizeUrl));
  const hasUnapprovedUrl = extractUrls(text).some((url) => !allowed.has(url));

  if (hasUnapprovedUrl) {
    return { safe: false, reason: "unapproved_url" };
  }

  return { safe: true, reason: "ok" };
}
