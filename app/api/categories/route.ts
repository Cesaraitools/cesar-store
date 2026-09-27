import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  findCategoryConflict,
  normalizeCategorySlug,
} from "@/lib/category-rules";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

function jsonNoStore(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);

  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(key, value);
  }

  return Response.json(data, { ...init, headers });
}

function protectResponseFromCaching(response: Response) {
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

function normalizeLocalizedContent(value: unknown) {
  const content = value && typeof value === "object" ? value : {};
  const localized = content as { title?: unknown; subtitle?: unknown };

  return {
    title: String(localized.title ?? "").trim(),
    subtitle: String(localized.subtitle ?? "").trim(),
  };
}

function duplicateMessage(field: "category" | "arTitle" | "enTitle") {
  if (field === "arTitle") {
    return "A category with this Arabic title already exists";
  }

  if (field === "enTitle") {
    return "A category with this English title already exists";
  }

  return "A category with this slug already exists";
}

async function getCategoryConflict(
  candidate: {
    category: string;
    ar: { title: string };
    en: { title: string };
  },
  excludedId?: string
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, category, ar, en");

  if (error) throw error;

  return findCategoryConflict(data || [], candidate, excludedId);
}

/* ---------------- GET ---------------- */

export async function GET(request: Request) {
  const isAdminRequest =
    new URL(request.url).searchParams.get("admin") === "true";

  if (isAdminRequest) {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) {
      return protectResponseFromCaching(guard.response);
    }
  }

  try {
    let query = supabase.from("categories").select("*");

    if (!isAdminRequest) {
      query = query.eq("active", true);
    }

    const { data, error } = await query.order("order", { ascending: true });

    if (error) throw error;

    return jsonNoStore(data);
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    return jsonNoStore(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/* ---------------- POST ---------------- */

export async function POST(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return protectResponseFromCaching(guard.response);

  try {
    const body = await request.json();
    const category = normalizeCategorySlug(body.category);
    const ar = normalizeLocalizedContent(body.ar);
    const en = normalizeLocalizedContent(body.en);
    const order = Number(body.order ?? 0);

    if (!category || !ar.title || !en.title) {
      return jsonNoStore(
        { error: "Category slug, Arabic title, and English title are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(order)) {
      return jsonNoStore(
        { error: "Category order must be a number" },
        { status: 400 }
      );
    }

    const newCategory = {
      category,
      image: String(body.image || "").trim(),
      en,
      ar,
      active: body.active ?? true,
      order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const conflict = await getCategoryConflict(newCategory);

    if (conflict) {
      return jsonNoStore(
        {
          error: duplicateMessage(conflict.field),
          code: "CATEGORY_DUPLICATE",
          conflict,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([newCategory])
      .select()
      .single();

    if (error) throw error;

    return jsonNoStore(data, { status: 201 });
  } catch (err) {
    console.error("POST CATEGORY ERROR:", err);

    return jsonNoStore(
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
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return protectResponseFromCaching(guard.response);

  try {
    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return jsonNoStore(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const category = normalizeCategorySlug(body.category);
    const ar = normalizeLocalizedContent(body.ar);
    const en = normalizeLocalizedContent(body.en);
    const order = Number(body.order ?? 0);

    if (!category || !ar.title || !en.title) {
      return jsonNoStore(
        { error: "Category slug, Arabic title, and English title are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(order)) {
      return jsonNoStore(
        { error: "Category order must be a number" },
        { status: 400 }
      );
    }

    const updates = {
      category,
      image: String(body.image || "").trim(),
      en,
      ar,
      active: body.active ?? true,
      order,
      updatedAt: new Date().toISOString(),
    };

    const conflict = await getCategoryConflict(updates, id);

    if (conflict) {
      return jsonNoStore(
        {
          error: duplicateMessage(conflict.field),
          code: "CATEGORY_DUPLICATE",
          conflict,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonNoStore(data);
  } catch (err) {
    console.error("PUT CATEGORY ERROR:", err);

    return jsonNoStore(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE ---------------- */

export async function DELETE(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return protectResponseFromCaching(guard.response);

  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoStore(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return jsonNoStore({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("DELETE CATEGORY ERROR:", err);

    return jsonNoStore(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
