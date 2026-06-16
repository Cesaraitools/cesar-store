import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { unstable_noStore as noStore } from "next/cache";
import {
  normalizeProductVariantOptions,
  normalizeProductVariants,
} from "@/lib/product-variants";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type { Product } from "@/types/product";

export type CatalogCategory = {
  id: string;
  image: string;
  category: string;
  en: {
    title: string;
    subtitle: string;
  };
  ar: {
    title: string;
    subtitle: string;
  };
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type ProductRow = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number | string | null;
  image_url: string | null;
  images_json: unknown;
  stock: number | null;
  category: string | null;
  is_active: boolean | null;
  low_stock_threshold: number | null;
  facebook_post_id?: string | null;
  facebook_post_permalink_url?: string | null;
  variant_options_json?: unknown;
  variants_json?: unknown;
  created_at: string | null;
  updated_at: string | null;
};

function toProduct(row: ProductRow): Product {
  const rawImages =
    Array.isArray(row.images_json) && row.images_json.length
      ? row.images_json
      : row.image_url
      ? [row.image_url]
      : [];

  return {
    id: String(row.id),
    name: {
      ar: row.name_ar || "",
      en: row.name_en || row.name_ar || "",
    },
    description: {
      ar: row.description_ar || "",
      en: row.description_en || row.description_ar || "",
    },
    price: Number(row.price ?? 0),
    category: normalizeCategory(row.category || "equipment"),
    images: normalizeImagesArray(rawImages),
    stock: Number(row.stock ?? 0),
    active: Boolean(row.is_active ?? true),
    low_stock_threshold:
      typeof row.low_stock_threshold === "number" ? row.low_stock_threshold : 10,
    facebookPostId: row.facebook_post_id || null,
    facebookPostPermalinkUrl: row.facebook_post_permalink_url || null,
    variantOptions: normalizeProductVariantOptions(row.variant_options_json),
    variants: normalizeProductVariants(
      row.variants_json,
      normalizeProductVariantOptions(row.variant_options_json)
    ),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function getActiveProducts(limit = 1000) {
  noStore();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .gt("stock", 0)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data || []) as ProductRow[]).map(toProduct);
}

export async function getActiveProductById(id: string) {
  noStore();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .gt("stock", 0)
    .single();

  if (error || !data) return null;

  return toProduct(data as ProductRow);
}

export async function getActiveCategories() {
  noStore();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("order", { ascending: true });

  if (error) throw error;

  return (data || []) as CatalogCategory[];
}
