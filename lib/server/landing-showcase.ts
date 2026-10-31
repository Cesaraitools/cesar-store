import { unstable_cache } from "next/cache";
import type { LandingShowcase } from "@/lib/landing-showcase";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

function normalizeLocalizedContent(value: unknown) {
  const content = value && typeof value === "object" ? value : {};
  const localized = content as { title?: unknown; subtitle?: unknown };

  return {
    title: String(localized.title ?? "").trim(),
    subtitle: String(localized.subtitle ?? "").trim(),
  };
}

async function fetchLandingShowcase(): Promise<LandingShowcase> {
  const supabase = createServiceRoleClient();

  const categoriesResult = await supabase
    .from("categories")
    .select("id, category, image, ar, en, order")
    .eq("active", true)
    .order("order", { ascending: true })
    .limit(7);

  if (categoriesResult.error) throw categoriesResult.error;

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

  return { categories };
}

export const getLandingShowcase = unstable_cache(
  fetchLandingShowcase,
  ["landing-showcase-v1"],
  {
    revalidate: 300,
    tags: ["landing-showcase"],
  }
);
