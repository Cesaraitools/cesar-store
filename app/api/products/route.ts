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

/* ---------------- GET ---------------- */
// ❌ بدون أي تغيير

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SUPABASE FETCH ERROR:", error);
    }

    const fallbackProducts = readProducts();

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
    const normalizedCategory = normalizeCategory(body.category);

    const validCategories = getValidCategorySlugs();

    if (!validCategories.includes(normalizedCategory)) {
      return Response.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // 🔥🔥🔥 Anti-Duplicate Logic (NEW)
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

    const { error } = await supabase.from("products").insert([
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
    ]);

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

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

    const images = normalizeImagesArray(updates.images || []);

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
        images_json: images, // 🔥 NEW
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

export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id: string };

    if (!id) {
      return Response.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    await supabase.from("products").delete().eq("id", id);

    return Response.json({ message: "Product deleted successfully" });

  } catch {
    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}