import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Category = {
  type: "category";
  id: string;
  image: string;
  category: string;
  en: {
    title: string;
    subtitle: string;
  };
  ar: {
    title: string;
    subtitle: string;
  };
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

const DATA_FILE = join(process.cwd(), "data-store", "categories.json");

/* ---------------- Helpers ---------------- */

function readCategories(): Category[] {
  try {
    const data = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error("Error reading categories:", error);
    return [];
  }
}

function writeCategories(categories: Category[]) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(categories, null, 2));
  } catch (error) {
    console.error("Error writing categories:", error);
  }
}

function isValidCategory(cat: Partial<Category>) {
  if (!cat.id || !cat.category) return false;
  if (!cat.en?.title || !cat.ar?.title) return false;
  if (typeof cat.order !== "number") return false;
  return true;
}

/* ---------------- GET ---------------- */

export async function GET() {
  try {
    const categories = readCategories();

    const safeCategories = categories
      .filter((c) => c.active !== false)
      .sort((a, b) => a.order - b.order);

    return Response.json(safeCategories);
  } catch {
    return Response.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/* ---------------- POST ---------------- */

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Category>;

    /* 🔥 FIX: normalize input بدون كسر أي حاجة */
    const newCategory: Category = {
      type: "category",
      id: String(body.id || body.category).toLowerCase().trim(),
      category: String(body.category || body.id).toLowerCase().trim(),
      image: body.image || "",
      en: body.en || { title: "", subtitle: "" },
      ar: body.ar || { title: "", subtitle: "" },
      active: body.active ?? true,
      order: Number(body.order ?? 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isValidCategory(newCategory)) {
      return Response.json(
        { error: "Invalid category data" },
        { status: 400 }
      );
    }

    const categories = readCategories();

    if (categories.find((c) => c.id === newCategory.id)) {
      return Response.json(
        { error: "Category with this ID already exists" },
        { status: 409 }
      );
    }

    categories.push(newCategory);
    writeCategories(categories);

    return Response.json(newCategory, { status: 201 });
  } catch (err) {
    console.error("CATEGORY CREATE ERROR:", err);

    return Response.json(
      {
        error: "Failed to create category",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}

/* ---------------- PUT ---------------- */

export async function PUT(request: Request) {
  try {
    const { id, ...updates } = (await request.json()) as Partial<Category> & {
      id: string;
    };

    if (!id) {
      return Response.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const categories = readCategories();
    const index = categories.findIndex((c) => c.id === id);

    if (index === -1) {
      return Response.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const updatedCategory: Category = {
      ...categories[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (!isValidCategory(updatedCategory)) {
      return Response.json(
        { error: "Invalid category update data" },
        { status: 400 }
      );
    }

    categories[index] = updatedCategory;
    writeCategories(categories);

    return Response.json(updatedCategory);
  } catch {
    return Response.json(
      { error: "Failed to update category" },
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
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const categories = readCategories();
    const filtered = categories.filter((c) => c.id !== id);

    if (filtered.length === categories.length) {
      return Response.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    writeCategories(filtered);

    return Response.json({ message: "Category deleted successfully" });
  } catch {
    return Response.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}