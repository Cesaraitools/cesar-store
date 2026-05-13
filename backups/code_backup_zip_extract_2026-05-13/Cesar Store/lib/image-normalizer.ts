export function normalizeImagePath(input: string): string | null {
  if (!input) return null;

  let imagePath = input.trim().replace(/\\/g, "/");

  if (!imagePath || imagePath.includes("..")) {
    return null;
  }

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  if (imagePath.startsWith("public/")) {
    imagePath = imagePath.slice("public".length);
  }

  if (imagePath.startsWith("/")) {
    return imagePath;
  }

  if (/^[^:]+$/.test(imagePath)) {
    return `/${imagePath.replace(/^\/+/, "")}`;
  }

  return null;
}

export function normalizeImagesArray(input: string | string[]): string[] {
  if (!input) return [];

  const values =
    typeof input === "string"
      ? input.split(/[\n;,]+/)
      : input;

  return values
    .map((value) => normalizeImagePath(String(value || "")))
    .filter((value): value is string => Boolean(value));
}
