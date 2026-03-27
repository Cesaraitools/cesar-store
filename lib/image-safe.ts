const PLACEHOLDER = "/placeholder.png";

export function getSafeImage(src?: string): string {
  if (!src || typeof src !== "string") return PLACEHOLDER;

  const trimmed = src.trim();

  if (!trimmed) return PLACEHOLDER;

  // منع قيم بايظة
  if (trimmed.includes("undefined")) return PLACEHOLDER;
  if (trimmed.includes("null")) return PLACEHOLDER;

  // لازم يبدأ بـ /
  if (!trimmed.startsWith("/")) return PLACEHOLDER;

  return trimmed;
}