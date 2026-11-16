const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function cleanOptionalProductField(value: unknown) {
  if (typeof value !== "string") return undefined;

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

export function normalizeGtin(value: unknown) {
  const cleaned = cleanOptionalProductField(value);
  if (!cleaned) return undefined;

  return cleaned.replace(/[\s-]+/g, "");
}

export function isValidGtin(value: string) {
  if (!/^\d+$/.test(value) || !GTIN_LENGTHS.has(value.length)) {
    return false;
  }

  const digits = value.split("").map(Number);
  const checkDigit = digits.pop();
  if (typeof checkDigit !== "number") return false;

  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);

  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function gtinStructuredData(gtin?: string) {
  if (!gtin || !isValidGtin(gtin)) return {};

  return { [`gtin${gtin.length}`]: gtin };
}
