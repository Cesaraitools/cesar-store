export function normalizeCategory(input?: string): string {
  if (!input) return "";

  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-"); // cars lights → cars-lights
}