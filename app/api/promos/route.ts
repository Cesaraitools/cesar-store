import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------------- GET ---------------- */
export async function GET() {
  try {
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
    const body = (await request.json()) as PromoData;

    if (!body.id || !body.position) {
      return Response.json(
        { error: "Missing required fields: id, position" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("promos")
      .insert([
        {
          id: body.id,
          position: body.position,
          is_active: body.isActive,
          product_id: body.productId || null,
          title: body.title,
          description: body.description,
          cta: body.cta,
          created_at: now,
          updated_at: now,
        },
      ])
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
    const { id, ...updates } = (await request.json()) as Partial<PromoData> & {
      id: string;
    };

    if (!id) {
      return Response.json(
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("promos")
      .update({
        position: updates.position,
        is_active: updates.isActive,
        product_id: updates.productId || null,
        title: updates.title,
        description: updates.description,
        cta: updates.cta,
        updated_at: new Date().toISOString(),
      })
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