import { normalizeImagesArray } from "@/lib/image-normalizer";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

function normalizeLocalizedContent(value: unknown) {
  const content = value && typeof value === "object" ? value : {};
  const localized = content as { title?: unknown; subtitle?: unknown };

  return {
    title: String(localized.title ?? "").trim(),
    subtitle: String(localized.subtitle ?? "").trim(),
  };
}

function normalizeCategoryKey(value: unknown) {
  const key = String(value ?? "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[\s_-]+/g, "");

  if (key === "accessories" || key === "carsaccessories") {
    return "carsaccessories";
  }

  return key;
}

function isOffersCategory(value: unknown) {
  const key = String(value ?? "").toLocaleLowerCase("en");
  return /offer|discount|promo|sale|عرض|تخفيض/.test(key);
}

export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, category, image, ar, en, order")
        .eq("active", true)
        .order("order", { ascending: true })
        .limit(7),
      supabase
        .from("products")
        .select(
          "id, name_ar, name_en, image_url, images_json, category, created_at"
        )
        .eq("is_active", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (productsResult.error) throw productsResult.error;

    const categories = (categoriesResult.data || [])
      .map((category) => ({
        id: String(category.id),
        category: String(category.category || "").trim(),
        image: String(category.image || "").trim(),
        ar: normalizeLocalizedContent(category.ar),
        en: normalizeLocalizedContent(category.en),
      }))
      .filter(
        (category) =>
          category.category &&
          category.image &&
          category.ar.title &&
          category.en.title
      );

    const productPool = (productsResult.data || []).flatMap((product) => {
      const images = normalizeImagesArray(
        Array.isArray(product.images_json) && product.images_json.length
          ? product.images_json
          : product.image_url
          ? [product.image_url]
          : []
      );

      if (!images[0]) return [];

      return [
        {
          id: String(product.id),
          image: images[0],
          category: String(product.category || ""),
          name: {
            ar: String(product.name_ar || ""),
            en: String(product.name_en || product.name_ar || ""),
          },
        },
      ];
    });

    const products = categories.flatMap((category) => {
      const categoryKey = normalizeCategoryKey(category.category);
      const limit = isOffersCategory(category.category) ? 1 : 3;

      return productPool
        .filter(
          (product) => normalizeCategoryKey(product.category) === categoryKey
        )
        .slice(0, limit);
    });

    return Response.json(
      { categories, products },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("LANDING SHOWCASE ERROR:", error);

    return Response.json(
      { error: "Failed to load landing showcase" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
