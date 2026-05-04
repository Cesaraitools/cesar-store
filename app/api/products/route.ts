import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { cleanupUnusedManagedImages } from "@/lib/server/media-assets";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type { Product } from "@/types/product";

const supabase = createServiceRoleClient();

function buildProductKey(nameAr: string, category: string) {
  return `${nameAr.trim().toLowerCase()}::${normalizeCategory(category)}`;
}

function toProductResponse(product: any): Product {
  const rawImages =
    Array.isArray(product?.images_json) && product.images_json.length
      ? product.images_json
      : product?.image_url
      ? [product.image_url]
      : [];

  return {
    id: String(product.id),
    name: {
      ar: product?.name_ar || "",
      en: product?.name_en || product?.name_ar || "",
    },
    description: {
      ar: product?.description_ar || "",
      en: product?.description_en || product?.description_ar || "",
    },
    price: Number(product?.price ?? 0),
    category: normalizeCategory(product?.category || "equipment"),
    images: normalizeImagesArray(rawImages),
    stock: Number(product?.stock ?? 0),
active: Boolean(product?.is_active ?? true),

low_stock_threshold:
  typeof product?.low_stock_threshold === "number"
    ? product.low_stock_threshold
    : 10,

createdAt: product?.created_at || new Date().toISOString(),
updatedAt: product?.updated_at || new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json((data || []).map(toProductResponse));
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return Response.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await validateAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<Product>;
    const images = normalizeImagesArray(body.images || []);
    const normalizedCategory = normalizeCategory(String(body.category || "").trim());

    if (!images.length) {
      return Response.json(
        { error: "At least one valid image is required" },
        { status: 400 }
      );
    }

    if (!body.name?.ar || !body.name?.en) {
      return Response.json(
        { error: "Invalid name fields" },
        { status: 400 }
      );
    }

    if (!body.description?.ar || !body.description?.en) {
      return Response.json(
        { error: "Invalid description fields" },
        { status: 400 }
      );
    }

    if (typeof body.price !== "number" || Number.isNaN(body.price)) {
      return Response.json({ error: "Invalid price" }, { status: 400 });
    }

    const { data: existingProducts, error: existingProductsError } = await supabase
      .from("products")
      .select("name_ar, category");

    if (existingProductsError) {
      throw existingProductsError;
    }

    const requestedKey = buildProductKey(body.name.ar, normalizedCategory);
    const exists = (existingProducts || []).some(
      (product) =>
        buildProductKey(String(product.name_ar || ""), String(product.category || "")) ===
        requestedKey
    );

    if (exists) {
      return Response.json(
        { message: "Product already exists - skipped" },
        { status: 200 }
      );
    }

    const now = new Date().toISOString();
    const productToSave: Product = {
      id: crypto.randomUUID(),
      name: body.name,
      description: body.description,
      price: body.price,
      category: normalizedCategory,
      images,
      stock: body.stock ?? 0,
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
      low_stock_threshold:
  typeof body.low_stock_threshold === "number" &&
  !Number.isNaN(body.low_stock_threshold)
    ? body.low_stock_threshold
    : 10,
    };

    const { error: insertError } = await supabase.from("products").insert([
      {
        id: productToSave.id,
        name_ar: productToSave.name.ar,
        name_en: productToSave.name.en || productToSave.name.ar,
        description_ar: productToSave.description.ar,
        description_en:
          productToSave.description.en || productToSave.description.ar,
        price: productToSave.price,
        image_url: productToSave.images[0],
        images_json: productToSave.images,
        stock: productToSave.stock,
        category: productToSave.category,
        is_active: productToSave.active,
        created_at: now,
        updated_at: now,
        low_stock_threshold: productToSave.low_stock_threshold,
      },
    ]);

    if (insertError) {
      throw insertError;
    }

    return Response.json(productToSave, { status: 201 });
  } catch (error) {
    console.error("PRODUCT CREATE ERROR:", error);

    return Response.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await validateAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, ...updates } = (await request.json()) as Partial<Product> & {
      id: string;
    };

    if (!id) {
      return Response.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const normalizedStock =
      typeof updates.stock === "number" && !Number.isNaN(updates.stock)
        ? updates.stock
        : undefined;

    const nextIsActive =
      normalizedStock !== undefined && normalizedStock <= 0
        ? false
        : typeof updates.active === "boolean"
        ? updates.active
        : normalizedStock !== undefined && normalizedStock > 0
        ? true
        : undefined;

    const { data: oldProduct, error: oldProductError } = await supabase
      .from("products")
      .select("images_json")
      .eq("id", id)
      .single();

    if (oldProductError) {
      throw oldProductError;
    }

    const oldImages: string[] = Array.isArray(oldProduct?.images_json)
      ? oldProduct.images_json
      : [];
    const images = normalizeImagesArray(updates.images || []);

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name_ar: updates.name?.ar,
        name_en: updates.name?.en || updates.name?.ar,
        description_ar: updates.description?.ar,
        description_en: updates.description?.en || updates.description?.ar,
        price: updates.price,
        stock: normalizedStock,
        is_active: nextIsActive,
        image_url: images[0] || null,
        images_json: images,
        category: normalizeCategory(updates.category),
         low_stock_threshold: updates.low_stock_threshold,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    const removedImages = oldImages.filter((image) => !images.includes(image));
    const cleanup = await cleanupUnusedManagedImages(removedImages);

    return Response.json({
      success: true,
      deletedImages: cleanup.deletedPaths.length,
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);

    return Response.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await validateAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = (await request.json()) as { id: string };

    if (!id) {
      return Response.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("images_json")
      .eq("id", id)
      .single();

    if (productError) {
      throw productError;
    }

    const productImages: string[] = Array.isArray(product?.images_json)
      ? product.images_json
      : [];

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    const cleanup = await cleanupUnusedManagedImages(productImages);

    return Response.json({
      message: "Product deleted safely",
      deletedImages: cleanup.deletedPaths.length,
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
