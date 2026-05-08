// /lib/image-normalizer.ts

export function normalizeImagePath(input: string): string | null {
  if (!input) return null;

  let path = input.trim();

  // remove spaces
  path = path.replace(/\s+/g, "");

  // block invalid patterns
  if (path.includes("..")) return null;

  // ✅ 1. external URL (Supabase or any CDN)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // ✅ 2. allow known local paths (fallback only)
  if (path.startsWith("/products") || path.startsWith("products/")) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  // ❌ 3. أي حاجة غير معروفة → نرفضها
  return null;
}

export function normalizeImagesArray(
  input: string | string[]
): string[] {
  if (!input) return [];

  const arr =
    typeof input === "string"
      ? input.split(",")
      : input;

  return arr
    .map((img) => normalizeImagePath(img))
    .filter((img): img is string => Boolean(img));
}