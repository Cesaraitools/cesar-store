import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/product";

const PRODUCTS_FILE = join(process.cwd(), "data-store", "products.json");
const CATEGORIES_FILE = join(process.cwd(), "data-store", "categories.json");

/* ---------------- Supabase ---------------- */

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

function isValidLangField(
  field: any
): field is { ar: string; en: string } {
  return (
    field &&
    typeof field === "object" &&
    typeof field.ar === "string" &&
    field.ar.trim() !== "" &&
    typeof field.en === "string" &&
    field.en.trim() !== ""
  );
}

/* ---------------- GET ---------------- */

export async function GET() {
  try {
    const { data, error } = await supabase.from("products").select("*");

    const fallbackProducts = readProducts();

    if (!error && data && data.length > 0) {
      const formatted: Product[] = data.map((p: any) => {
        const fallback = fallbackProducts.find(fp => fp.id === p.id);

        return {
          id: p.id,
          name: {
            ar: p.name_ar || fallback?.name?.ar || "",
            en:
              p.name_en ||
              fallback?.name?.en ||
              p.name_ar ||
              "",
          },
          description: {
            ar: p.description_ar || fallback?.description?.ar || "",
            en:
              p.description_en ||
              fallback?.description?.en ||
              p.description_ar ||
              "",
          },
          price: p.price,
          category: fallback?.category || "equipment",
          images:
            p.image_url
              ? [p.image_url]
              : fallback?.images || [],
          stock: p.stock ?? 0,
          active: true,
          createdAt:
            fallback?.createdAt || new Date().toISOString(),
          updatedAt:
            p.updated_at || new Date().toISOString(),
        };
      });

      return Response.json(formatted);
    }

    const products = readProducts();

    const safeProducts = products.filter(
      (p) =>
        p.active !== false &&
        isValidLangField(p.name) &&
        typeof p.price === "number" &&
        Array.isArray(p.images)
    );

    return Response.json(safeProducts);

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

    if (typeof body.category === "string") {
      body.category = body.category.toLowerCase().trim();
    }

    const validCategories = getValidCategorySlugs();

    if (!body.id) {
      return Response.json({ error: "Product id is required" }, { status: 400 });
    }

    const products = readProducts();

    if (products.find((p) => p.id === body.id)) {
      return Response.json(
        { error: "Product with this ID already exists" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const productToSave: Product = {
      id: body.id!,
      name: body.name!,
      description: body.description!,
      price: body.price!,
      category: body.category!,
      images: body.images!,
      stock: body.stock ?? 0,
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await supabase.from("products").insert([
      {
        id: productToSave.id,
        name_ar: productToSave.name.ar,
        name_en: productToSave.name.en || productToSave.name.ar,
        description_ar: productToSave.description.ar,
        description_en:
          productToSave.description.en || productToSave.description.ar,
        price: productToSave.price,
        image_url: productToSave.images[0] || null,
        stock: productToSave.stock,
      },
    ]);

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

/* ---------------- PUT (FIXED) ---------------- */

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

    // 🟢 تحديث Supabase بالكامل
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

        image_url:
          Array.isArray(updates.images) && updates.images.length > 0
            ? updates.images[0]
            : null,

        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // 🟢 تحديث fallback JSON
    const products = readProducts();
    const index = products.findIndex((p) => p.id === id);

    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updates,
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