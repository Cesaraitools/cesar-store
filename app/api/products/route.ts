import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Product } from "@/types/product";

const PRODUCTS_FILE = join(process.cwd(), "data-store", "products.json");
const CATEGORIES_FILE = join(process.cwd(), "data-store", "categories.json");

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
  writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

/* ✅ FIX: استخدام slug بدل category */
function getValidCategorySlugs(): string[] {
  try {
    const categories = readJSON<any[]>(CATEGORIES_FILE);
    return categories
      .filter((c) => c.active === true && typeof c.slug === "string")
      .map((c) => c.slug.toLowerCase().trim());
  } catch {
    return [];
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

function isValidProductInput(
  product: Partial<Product>,
  validCategories: string[]
): string | null {
  if (!product.id || typeof product.id !== "string")
    return "Product id is required";

  if (!isValidLangField(product.name))
    return "Product name (ar/en) is required";

  if (!isValidLangField(product.description))
    return "Product description (ar/en) is required";

  if (typeof product.price !== "number" || product.price <= 0)
    return "Product price must be a number greater than 0";

  if (
    !product.category ||
    typeof product.category !== "string" ||
    !validCategories.includes(product.category.toLowerCase().trim()) // ✅ FIX
  )
    return "Invalid product category";

  if (
    !Array.isArray(product.images) ||
    product.images.length === 0 ||
    !product.images.every((img) => typeof img === "string")
  )
    return "Product images must be a non-empty array of strings";

  if (product.stock !== undefined && product.stock < 0)
    return "Product stock cannot be negative";

  return null;
}

/* ---------------- GET ---------------- */

export async function GET() {
  try {
    const products = readProducts();

    const safeProducts = products.filter(
      (p) =>
        p.active !== false &&
        isValidLangField(p.name) &&
        typeof p.price === "number" &&
        Array.isArray(p.images)
    );

    return Response.json(safeProducts);
  } catch {
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

    /* ✅ FIX: normalize category */
    if (typeof body.category === "string") {
      body.category = body.category.toLowerCase().trim();
    }

    const validCategories = getValidCategorySlugs();
    const validationError = isValidProductInput(body, validCategories);

    if (validationError) {
      return Response.json(
        { error: validationError },
        { status: 400 }
      );
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

    const products = readProducts();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      return Response.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const updatedProduct: Product = {
      ...products[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const validCategories = getValidCategorySlugs();
    const validationError = isValidProductInput(
      updatedProduct,
      validCategories
    );

    if (validationError) {
      return Response.json(
        { error: validationError },
        { status: 400 }
      );
    }

    products[index] = updatedProduct;
    writeProducts(products);

    return Response.json(updatedProduct);
  } catch {
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

    const products = readProducts();
    const filtered = products.filter((p) => p.id !== id);

    if (filtered.length === products.length) {
      return Response.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    writeProducts(filtered);

    return Response.json({ message: "Product deleted successfully" });
  } catch {
    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}