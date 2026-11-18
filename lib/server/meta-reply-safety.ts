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

function extractPublicPriceAmounts(value: string) {
  const text = normalizeDigits(value.replace(URL_PATTERN, " "));
  const patterns = [
    /(?:السعر|سعر|price|cost)\s*(?::|-)?\s*([\d][\d,.]*)/giu,
    /([\d][\d,.]*)\s*(?:جنيه(?:اً|ا)?|ج\.?\s*م\.?|egp\b)/giu,
  ];
  const values = patterns.flatMap((pattern) =>
    Array.from(text.matchAll(pattern), (match) =>
      Number(match[1].replace(/,/g, ""))
    )
  );

  return Array.from(new Set(values.filter(Number.isFinite)));
}

function hasOnlyAllowedPublicPrices(value: string, allowedPrices: number[]) {
  const allowed = allowedPrices.filter(
    (price) => Number.isFinite(price) && price > 0
  );
  const amounts = extractPublicPriceAmounts(value);

  if (!allowed.length || !amounts.length) return false;

  return amounts.every((amount) =>
    allowed.some((price) => Math.abs(price - amount) < 0.01)
  );
}

export function validateMetaPublicReply(
  reply: string,
  allowedUrls: string[] = [],
  allowedPrices: number[] = []
): MetaReplySafetyResult {
  const text = reply.trim();
  if (!text) return { safe: false, reason: "empty_reply" };

  if (containsPublicPrice(text) && !hasOnlyAllowedPublicPrices(text, allowedPrices)) {
    return { safe: false, reason: "public_price_detected" };
  }

  const allowed = new Set(allowedUrls.filter(Boolean).map(normalizeUrl));
  const hasUnapprovedUrl = extractUrls(text).some((url) => !allowed.has(url));

  if (hasUnapprovedUrl) {
    return { safe: false, reason: "unapproved_url" };
  }

  return { safe: true, reason: "ok" };
}
