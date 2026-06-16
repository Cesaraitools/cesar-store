import { createClient } from "@supabase/supabase-js";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import {
  normalizeProductVariantOptions,
  normalizeProductVariants,
} from "@/lib/product-variants";
import type { Product } from "@/types/product";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// GET /api/products/[id]
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
   const { data: product, error } = await supabase
  .from("products")
  .select("*")
  .eq("id", params.id)
  .eq("is_active", true)
  .gt("stock", 0)
  .single();
  if (error || !product) {
      return Response.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const variantOptions = normalizeProductVariantOptions(
      product.variant_options_json
    );

    return Response.json({
      id: product.id,
      name: {
        ar: product.name_ar || "",
        en: product.name_en || product.name_ar || "",
      },
      description: {
        ar: product.description_ar || "",
        en: product.description_en || product.description_ar || "",
      },
      price: product.price ?? 0,
      category: product.category,
      images: normalizeImagesArray(
        Array.isArray(product.images_json) && product.images_json.length
          ? product.images_json
          : product.image_url
          ? [product.image_url]
          : []
      ),
      stock: product.stock ?? 0,
      active: product.is_active ?? true,
      low_stock_threshold:
        typeof product.low_stock_threshold === "number"
          ? product.low_stock_threshold
          : 10,
      facebookPostId: product.facebook_post_id || null,
      facebookPostPermalinkUrl: product.facebook_post_permalink_url || null,
      variantOptions,
      variants: normalizeProductVariants(product.variants_json, variantOptions),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
