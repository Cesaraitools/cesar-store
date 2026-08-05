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

export function validateMetaPublicReply(
  reply: string,
  allowedUrls: string[] = []
): MetaReplySafetyResult {
  const text = reply.trim();
  if (!text) return { safe: false, reason: "empty_reply" };

  if (containsPublicPrice(text)) {
    return { safe: false, reason: "public_price_detected" };
  }

  const allowed = new Set(allowedUrls.filter(Boolean).map(normalizeUrl));
  const hasUnapprovedUrl = extractUrls(text).some((url) => !allowed.has(url));

  if (hasUnapprovedUrl) {
    return { safe: false, reason: "unapproved_url" };
  }

  return { safe: true, reason: "ok" };
}
