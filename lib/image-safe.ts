// lib/image-safe.ts

const PLACEHOLDER = "/placeholder.png";

export function getSafeImage(src?: string): string {
  if (!src || typeof src !== "string") return PLACEHOLDER;

  const trimmed = src.trim();

  // 🔥 FIX: السماح بأي URL http/https
  if (trimmed.startsWith("http")) return trimmed;

  // 🔥 حماية فقط للحالات الواضحة جدًا
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") {
    return PLACEHOLDER;
  }

  return trimmed;
}