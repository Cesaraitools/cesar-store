// /app/api/products/route.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Product } from "@/types/product";
import { requireAdminAccess } from "@/lib/auth/requireAdminAccess";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { normalizeCategory } from "@/lib/category-normalizer";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";

const PRODUCTS_FILE = join(process.cwd(), "data-store", "products.json");
const CATEGORIES_FILE = join(process.cwd(), "data-store", "categories.json");

/* ---------------- GET ---------------- */

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SUPABASE FETCH ERROR:", error);
    }

    
    const supabaseMap = new Map(
      (data || []).map((p: any) => [p.id, p])
    );

    const allIds = Array.from(
      new Set([
       ...(data || []).map((p: any) => p.id),
      ])
    );

    const formatted: Product[] = [];

    allIds.forEach((id) => {
      const p = supabaseMap.get(id);
     let rawImages: string[] = [];

      if (p?.images_json && Array.isArray(p.images_json)) {
        rawImages = p.images_json;
      } else {
        rawImages = p?.image_url ? [p.image_url] : [];
      }

      const images = normalizeImagesArray(rawImages);

      formatted.push({
        id,
        name: {
      
  ar: p?.name_ar || "",
  en: p?.name_en || p?.name_ar || "",
},
        description: {
  ar: p?.description_ar || "",
  en: p?.description_en || p?.description_ar || "",
},

        price: p?.price ?? 0,
        category: normalizeCategory(
  p?.category || "equipment"
),
        images,
        stock: p?.stock ?? 0,
        active: p?.is_active ?? true,
        createdAt:
  p?.created_at || new Date().toISOString(),
        updatedAt:
          p?.updated_at || new Date().toISOString(),
      });
    });

    return Response.json(formatted);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);

    return Response.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/* ---------------- POST ---------------- */

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminAccess();
    if (unauthorized) return unauthorized;
    const supabase = createServiceRoleClient();

    const body = (await request.json()) as Partial<Product>;

    const images = normalizeImagesArray(body.images || []);

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

    if (typeof body.price !== "number" || isNaN(body.price)) {
      return Response.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const normalizedCategory = normalizeCategory(
      String(body.category || "")
        .toLowerCase()
        .trim()
    );

    const { data: existingProducts } = await supabase
      .from("products")
      .select("name_ar, category");

    const exists = existingProducts?.some(
      (p) =>
        p.name_ar?.trim() === body.name?.ar?.trim() &&
        p.category === normalizedCategory
    );

    if (exists) {
      return Response.json(
        { message: "Product already exists - skipped" },
        { status: 200 }
      );
    }

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
    };

    await supabase.from("products").upsert(
      [
        {
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
        },
      ],
      {
        onConflict: "name_ar,category",
      }
    );

    return Response.json(productToSave, { status: 201 });

  } catch (err) {
    console.error("PRODUCT CREATE ERROR:", err);

    return Response.json(
      {
        error: "Failed to create product",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}

/* ---------------- PUT ---------------- */

export async function PUT(request: Request) {
  try {
    const unauthorized = requireAdminAccess();
    if (unauthorized) return unauthorized;
    const supabase = createServiceRoleClient();

    const { id, ...updates } = (await request.json()) as Partial<Product> & {
      id: string;
    };

    if (!id) {
      return Response.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // 🔥 1. get OLD images
    const { data: oldProduct } = await supabase
      .from("products")
      .select("images_json")
      .eq("id", id)
      .single();

    const oldImages: string[] = oldProduct?.images_json || [];

    // 🔥 2. normalize new images
    const images = normalizeImagesArray(updates.images || []);

    // 🔥 3. UPDATE FIRST (important fix)
    await supabase
      .from("products")
      .update({
        name_ar: updates.name?.ar,
        name_en: updates.name?.en || updates.name?.ar,
        description_ar: updates.description?.ar,
        description_en:
          updates.description?.en || updates.description?.ar,
        price: updates.price,
        stock: updates.stock,
        image_url: images[0] || null,
        images_json: images,
        category: normalizeCategory(updates.category),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // 🔥 4. get ALL products AFTER update
    const { data: allProducts } = await supabase
      .from("products")
      .select("images_json");

    const usedImages = new Set<string>();

    allProducts?.forEach((p) => {
      if (Array.isArray(p.images_json)) {
        p.images_json.forEach((img: string) => {
          usedImages.add(img);
        });
      }
    });

    // 🔥 5. find images to delete
    const imagesToDelete = oldImages.filter((img) => {
      const removed = !images.includes(img);

      const isSupabase =
        img.includes("/storage/v1/object/public/upload/");

      const normalize = (url: string) =>
  url.split("/storage/v1/object/public/")[1] || url;

const isStillUsed = Array.from(usedImages).some(
  (used) => normalize(used) === normalize(img)
);
      return removed && isSupabase && !isStillUsed;
    });

    const paths = imagesToDelete.map((img) => {
  const fullPath = img.split("/storage/v1/object/public/")[1];

  if (!fullPath) return "";

  return fullPath.replace(/^upload\//, "");
}).filter(Boolean);

    // 🔥 6. delete unused images
    if (paths.length > 0) {
      await supabase.storage.from("upload").remove(paths);
    }

    
    return Response.json({
      success: true,
      deletedImages: paths.length,
    });

  } catch (err) {
    console.error("UPDATE ERROR:", err);

    return Response.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
/* ---------------- DELETE ---------------- */

export async function DELETE(request: Request) {
  try {
    const unauthorized = requireAdminAccess();
    if (unauthorized) return unauthorized;
    const supabase = createServiceRoleClient();

    const { id } = (await request.json()) as { id: string };

    if (!id) {
      return Response.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // 🔥 1. get product images
    const { data: product } = await supabase
      .from("products")
      .select("images_json")
      .eq("id", id)
      .single();

    const productImages: string[] = product?.images_json || [];

    // 🔥 2. get ALL images from all products
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, images_json");

    const usedImages = new Set<string>();

    allProducts?.forEach((p) => {
      if (p.id === id) return; // تجاهل المنتج اللي هيتحذف

      if (Array.isArray(p.images_json)) {
        p.images_json.forEach((img: string) => {
          usedImages.add(img);
        });
      }
    });

    // 🔥 3. filter images that are SAFE to delete
    const imagesToDelete = productImages.filter((img) => {
      const isSupabase =
        img.includes("/storage/v1/object/public/upload/");

      const normalize = (url: string) =>
  url.split("/storage/v1/object/public/")[1] || url;

const isUsedElsewhere = Array.from(usedImages).some(
  (used) => normalize(used) === normalize(img)
);

      return isSupabase && !isUsedElsewhere;
    });

    // 🔥 4. extract paths
    const paths = imagesToDelete.map((img) => {
  const fullPath = img.split("/storage/v1/object/public/")[1];

  if (!fullPath) return "";

  return fullPath.replace(/^upload\//, "");
}).filter(Boolean);

    // 🔥 5. delete from storage
    if (paths.length > 0) {
      await supabase.storage.from("upload").remove(paths);
    }

    // 🔥 6. delete product
    await supabase.from("products").delete().eq("id", id);

    return Response.json({
      message: "Product deleted safely",
      deletedImages: paths.length,
    });

  } catch (err) {
    console.error("DELETE ERROR:", err);

    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
