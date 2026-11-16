// lib/image-safe.ts

const PLACEHOLDER = "/placeholder.png";
const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_PUBLIC_RENDER_PATH = "/storage/v1/render/image/public/";

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

export function getOptimizedDeliveryImage(
  src?: string,
  width = 640,
  quality = 70
): string {
  const safeImage = getSafeImage(src);

  try {
    const url = new URL(safeImage);
    const isSupportedSupabaseImage =
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.includes(SUPABASE_PUBLIC_OBJECT_PATH) &&
      /\.(?:png|jpe?g|webp)$/i.test(url.pathname);

    if (!isSupportedSupabaseImage) return safeImage;

    url.pathname = url.pathname.replace(
      SUPABASE_PUBLIC_OBJECT_PATH,
      SUPABASE_PUBLIC_RENDER_PATH
    );
    url.searchParams.set("width", String(Math.min(2500, Math.max(32, Math.round(width)))));
    url.searchParams.set("quality", String(Math.min(100, Math.max(20, Math.round(quality)))));
    url.searchParams.set("resize", "contain");

    return url.toString();
  } catch {
    return safeImage;
  }
}
