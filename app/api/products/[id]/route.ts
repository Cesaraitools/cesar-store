import { readFileSync } from "fs";
import { join } from "path";
import type { Product } from "@/types/product";

const DATA_FILE = join(process.cwd(), "data-store", "products.json");

function readProducts(): Product[] {
  try {
    const data = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading products:", error);
    return [];
  }
}

// GET /api/products/[id]
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const products = readProducts();

    const product = products.find(
      (p) =>
        p.id === params.id &&
        p.active !== false &&
        p.stock > 0
    );

    if (!product) {
      return Response.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return Response.json(product);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
