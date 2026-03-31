// /app/api/products/route.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/product";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { normalizeCategory } from "@/lib/category-normalizer";

const PRODUCTS_FILE = join(process.cwd(), "data-store", "products.json");
const CATEGORIES_FILE = join(process.cwd(), "data-store", "categories.json");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------------- Helpers ---------------- */

function readJSON<T>(filePath: string): T {
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function readProducts(): Product[] {
  try {
    const parsed = readJSON<Product[]>(PRODUCTS_FILE);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProducts(products: Product[]): void {
  try {
    writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch {
    console.warn("⚠️ write skipped (vercel)");
  }
}

function getValidCategorySlugs(): string[] {
  try {
    const categories = readJSON<any[]>(CATEGORIES_FILE);

    const valid = categories
      .filter((c) => c.active === true && typeof c.category === "string")
      .map((c) => c.category.toLowerCase().trim());

    if (valid.length === 0) {
      return ["accessories", "air-fresheners", "additives-fluids", "equipment"];
    }

    return valid;
  } catch {
    return ["accessories", "air-fresheners", "additives-fluids", "equipment"];
  }
}

/* ---------------- NEW: Upload Layer ---------------- */

async function uploadImagesIfNeeded(images: string[]): Promise<string[]> {
  const result: string[] = [];

  for (const img of images) {
    try {
      // ✅ already uploaded
      if (img.includes("/storage/v1/object/public/upload/")) {
        result.push(img);
        continue;
      }

      let finalUrl = img;

      // 🔥 NEW: handle local paths
      if (img.startsWith("/products")) {
        finalUrl = `https://cesareshop.com${img}`;
      }

      // ✅ handle URLs
      if (finalUrl.startsWith("http")) {
        const res = await fetch(finalUrl);
        const buffer = await res.arrayBuffer();

        const fileName = `products/${crypto.randomUUID()}.jpg`;

        const { error } = await supabase.storage
          .from("upload")
          .upload(fileName, buffer, {
            contentType: "image/jpeg",
          });

        if (error) {
          console.error("UPLOAD ERROR:", error);
          continue;
        }

        const { data } = supabase.storage
          .from("upload")
          .getPublicUrl(fileName);

        result.push(data.publicUrl);
        continue;
      }

      // fallback
      result.push(img);

    } catch (err) {
      console.error("UPLOAD FAIL:", err);
    }
  }

  return result;
}

/* ---------------- GET ---------------- */

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SUPABASE FETCH ERROR:", error);
    }

    const fallbackProducts = (!data || data.length === 0)
      ? readProducts()
      : [];

    const supabaseMap = new Map(
      (data || []).map((p: any) => [p.id, p])
    );

    const allIds = Array.from(
      new Set([
        ...fallbackProducts.map((p) => p.id),
        ...(data || []).map((p: any) => p.id),
      ])
    );

    const formatted: Product[] = [];

    allIds.forEach((id) => {
      const p = supabaseMap.get(id);
      const fallback = fallbackProducts.find((fp) => fp.id === id);

      let rawImages: string[] = [];

      if (p?.images_json && Array.isArray(p.images_json)) {
        rawImages = p.images_json;
      } else {
        rawImages = [
          ...(p?.image_url ? [p.image_url] : []),
          ...(fallback?.images || []),
        ];
      }

      const images = normalizeImagesArray(rawImages);

      formatted.push({
        id,
        name: {
          ar: p?.name_ar || fallback?.name?.ar || "",
          en:
            p?.name_en ||
            fallback?.name?.en ||
            p?.name_ar ||
            "",
        },
        description: {
          ar: p?.description_ar || fallback?.description?.ar || "",
          en:
            p?.description_en ||
            fallback?.description?.en ||
            p?.description_ar ||
            "",
        },
        price: p?.price ?? fallback?.price ?? 0,
        category: normalizeCategory(
          p?.category ||
          fallback?.category ||
          "equipment"
        ),
        images,
        stock: p?.stock ?? fallback?.stock ?? 0,
        active: p?.is_active ?? fallback?.active ?? true,
        createdAt:
          fallback?.createdAt || new Date().toISOString(),
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
    const body = (await request.json()) as Partial<Product>;

    let images = normalizeImagesArray(body.images || []);

    // 🔥 NEW: upload layer
    images = await uploadImagesIfNeeded(images);

    const isBulkImport =
      typeof body.images === "string" || !body.images;

    if (!images.length && !isBulkImport) {
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

    const validCategories = getValidCategorySlugs();

    if (!validCategories.includes(normalizedCategory)) {
      return Response.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

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

    const products = readProducts();
    products.push(productToSave);
    writeProducts(products);

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
    const { id, ...updates } = (await request.json()) as Partial<Product> & {
      id: string;
    };

    if (!id) {
      return Response.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    let images = normalizeImagesArray(updates.images || []);

    // 🔥 NEW
    images = await uploadImagesIfNeeded(images);

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

    const products = readProducts();
    const index = products.findIndex((p) => p.id === id);

    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updates,
        images,
        updatedAt: new Date().toISOString(),
      } as Product;

      writeProducts(products);
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("UPDATE ERROR:", err);

    return Response.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE ---------------- */
// (لم يتم التعديل عليه نهائيًا)

/* ---------------- DELETE ---------------- */

export async function DELETE(request: Request) {
  try {
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

      const isUsedElsewhere = usedImages.has(img);

      return isSupabase && !isUsedElsewhere;
    });

    // 🔥 4. extract paths
    const paths = imagesToDelete.map((img) =>
      img.split("/storage/v1/object/public/")[1]
    );

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