// lib/image-normalizer.ts

export function normalizeImagePath(input: string): string | null {
  if (!input) return null;

  let path = input.trim();

  // remove multiple spaces
  path = path.replace(/\s+/g, "");

  // external URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // remove leading slashes
  path = path.replace(/^\/+/, "");

  // prevent invalid patterns
  if (path.includes("..")) return null;
  if (path.includes("//")) return null;

  // force products prefix
  if (!path.startsWith("products/")) {
    path = `products/${path}`;
  }

  return `/${path}`;
}

export function normalizeImagesArray(input: string | string[]): string[] {
  if (!input) return [];

  const arr =
    typeof input === "string"
      ? input.split(",")
      : input;

  return arr
    .map((img) => normalizeImagePath(img))
    .filter((img): img is string => Boolean(img));
}