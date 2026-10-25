import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import {
  normalizeProductVariantOptions,
  normalizeProductVariants,
} from "@/lib/product-variants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminRole(["full", "orders"]);
  if (guard.response) return guard.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name_ar, name_en, price, image_url, images_json, stock, is_active, variant_options_json, variants_json"
      )
      .is("deleted_at", null)
      .order("name_ar", { ascending: true });

    if (error) throw error;

    const products = (data || []).map((product) => {
      const variantOptions = normalizeProductVariantOptions(
        product.variant_options_json
      );
      const variants = normalizeProductVariants(
        product.variants_json,
        variantOptions
      );
      const images = Array.isArray(product.images_json)
        ? product.images_json.filter((image): image is string => typeof image === "string")
        : [];

      return {
        id: String(product.id),
        name: {
          ar: String(product.name_ar || ""),
          en: String(product.name_en || product.name_ar || ""),
        },
        price: Number(product.price || 0),
        image: images[0] || product.image_url || null,
        stock: Math.max(0, Number(product.stock || 0)),
        active: Boolean(product.is_active),
        variantOptions,
        variants,
      };
    });

    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Failed to load order item catalog", error);
    return NextResponse.json(
      { error: "تعذر تحميل قائمة المنتجات" },
      { status: 500 }
    );
  }
}
