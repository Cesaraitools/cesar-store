import { requireAdminAccess } from "@/lib/auth/requireAdminAccess";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";

export type PromoPosition = "categories_side";

export type PromoData = {
  id: string;
  position: PromoPosition;
  isActive: boolean;

  productId?: string;

  title: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  cta: {
    ar: string;
    en: string;
    link: string;
  };

  createdAt: string;
  updatedAt: string;
};

/* ---------------- GET ---------------- */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("promos")
      .select("*");

    if (error) throw error;

    return Response.json(data || []);
  } catch (err) {
    console.error("GET PROMOS ERROR:", err);

    return Response.json(
      { error: "Failed to fetch promos" },
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
  const id = String(body.id ?? "").trim();
  const position = String(body.position ?? "").trim();

    if (!id || !position) {
      return Response.json(
        { error: "Missing required fields: id, position" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const promoToInsert = {
      id,
      position,
      is_active: Boolean(body.isActive ?? true),
      product_id: body.productId ? String(body.productId) : null,
      title: {
        ar: String(body.title?.ar ?? ""),
        en: String(body.title?.en ?? ""),
      },
      description: {
        ar: String(body.description?.ar ?? ""),
        en: String(body.description?.en ?? ""),
      },
      cta: {
        ar: String(body.cta?.ar ?? ""),
        en: String(body.cta?.en ?? ""),
        link: String(body.cta?.link ?? ""),
      },
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("promos")
      .insert([promoToInsert])
      .select()
      .single();

    if (error) throw error;

    return Response.json(data, { status: 201 });
  } catch (err) {
    console.error("CREATE PROMO ERROR:", err);

    return Response.json(
      { error: "Failed to create promo" },
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
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.position !== undefined) updates.position = String(body.position);
    if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);
    if (body.productId !== undefined) updates.product_id = body.productId ? String(body.productId) : null;
    if (body.title !== undefined) {
      updates.title = {
        ar: String(body.title?.ar ?? ""),
        en: String(body.title?.en ?? ""),
      };
    }
    if (body.description !== undefined) {
      updates.description = {
        ar: String(body.description?.ar ?? ""),
        en: String(body.description?.en ?? ""),
      };
    }
    if (body.cta !== undefined) {
      updates.cta = {
        ar: String(body.cta?.ar ?? ""),
        en: String(body.cta?.en ?? ""),
        link: String(body.cta?.link ?? ""),
      };
    }

    const { data, error } = await supabase
      .from("promos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json(data);
  } catch (err) {
    console.error("UPDATE PROMO ERROR:", err);

    return Response.json(
      { error: "Failed to update promo" },
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
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("promos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return Response.json({ message: "Promo deleted successfully" });
  } catch (err) {
    console.error("DELETE PROMO ERROR:", err);

    return Response.json(
      { error: "Failed to delete promo" },
      { status: 500 }
    );
  }
}
