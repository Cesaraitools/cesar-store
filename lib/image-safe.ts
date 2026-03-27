// lib/image-safe.ts

const PLACEHOLDER = "/placeholder.png";

export function getSafeImage(src?: string): string {
  if (!src || typeof src !== "string") return PLACEHOLDER;

  const trimmed = src.trim();

  if (!trimmed) return PLACEHOLDER;

  // حماية من paths غلط
  if (trimmed.includes("undefined")) return PLACEHOLDER;
  if (trimmed.includes("null")) return PLACEHOLDER;

  return trimmed;
}