import type { Product } from "@/types/product";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";

// GET /api/products/[id]
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceRoleClient();
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
      images: product.images_json || (product.image_url ? [product.image_url] : []),
      stock: product.stock ?? 0,
      active: product.is_active ?? true,
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
