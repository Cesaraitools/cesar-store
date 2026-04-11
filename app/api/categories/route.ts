import { requireAdminAccess } from "@/lib/auth/requireAdminAccess";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";

type Category = {
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

/* ---------------- GET ---------------- */

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("order", { ascending: true });

    if (error) throw error;

    return Response.json(data);
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    return Response.json(
      { error: "Failed to fetch categories" },
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

    const body = await request.json();

    const id = String(body.id || body.category || "").toLowerCase().trim();
    const category = String(body.category || body.id || "").toLowerCase().trim();

    if (!id || !category) {
      return Response.json(
        { error: "Missing required fields: id or category" },
        { status: 400 }
      );
    }

    const newCategory = {
      id,
      category,
      image: String(body.image ?? ""),
      en: {
        title: String(body.en?.title ?? ""),
        subtitle: String(body.en?.subtitle ?? ""),
      },
      ar: {
        title: String(body.ar?.title ?? ""),
        subtitle: String(body.ar?.subtitle ?? ""),
      },
      active: Boolean(body.active ?? true),
      order: Number(body.order ?? 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("categories")
      .insert([newCategory])
      .select()
      .single();

    if (error) throw error;

    return Response.json(data, { status: 201 });
  } catch (err) {
    console.error("POST CATEGORY ERROR:", err);

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
    const unauthorized = requireAdminAccess();
    if (unauthorized) return unauthorized;
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return Response.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.category !== undefined) updates.category = String(body.category).toLowerCase().trim();
    if (body.image !== undefined) updates.image = String(body.image);
    if (body.en !== undefined) {
      updates.en = {
        title: String(body.en?.title ?? ""),
        subtitle: String(body.en?.subtitle ?? ""),
      };
    }
    if (body.ar !== undefined) {
      updates.ar = {
        title: String(body.ar?.title ?? ""),
        subtitle: String(body.ar?.subtitle ?? ""),
      };
    }
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (body.order !== undefined) updates.order = Number(body.order);

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json(data);
  } catch (err) {
    console.error("PUT CATEGORY ERROR:", err);

    return Response.json(
      { error: "Failed to update category" },
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

    const { id } = await request.json();

    if (!id) {
      return Response.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return Response.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("DELETE CATEGORY ERROR:", err);

    return Response.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
