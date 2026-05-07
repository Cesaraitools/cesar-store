import { createClient } from "@supabase/supabase-js";
import { normalizeImagePath, normalizeImagesArray } from "@/lib/image-normalizer";
import {
  createEmptyPromo,
  PROMO_POSITIONS,
  type PromoData,
  type PromoPosition,
} from "@/types/promo";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isPromoPosition(value: unknown): value is PromoPosition {
  return (
    typeof value === "string" &&
    PROMO_POSITIONS.includes(value as PromoPosition)
  );
}

function normalizeLocalizedText(value: unknown) {
  return {
    ar:
      value && typeof value === "object" && "ar" in value && typeof value.ar === "string"
        ? value.ar
        : "",
    en:
      value && typeof value === "object" && "en" in value && typeof value.en === "string"
        ? value.en
        : "",
  };
}

function normalizeCta(value: unknown) {
  return {
    ...normalizeLocalizedText(value),
    link:
      value &&
      typeof value === "object" &&
      "link" in value &&
      typeof value.link === "string"
        ? value.link
        : "",
  };
}

function toPromoResponse(row: any): PromoData | null {
  if (!isPromoPosition(row?.position)) {
    return null;
  }

  const images = normalizeImagesArray(
    Array.isArray(row?.images_json) && row.images_json.length
      ? row.images_json
      : row?.image_url
      ? [row.image_url]
      : []
  );

  return {
    id: String(row?.id || row.position),
    position: row.position,
    isActive: Boolean(row?.is_active ?? row?.isActive ?? false),
    productId:
      typeof row?.product_id === "string"
        ? row.product_id
        : typeof row?.productId === "string"
        ? row.productId
        : "",
    image: images[0] || "",
    images,
    title: normalizeLocalizedText(row?.title),
    description: normalizeLocalizedText(row?.description),
    cta: normalizeCta(row?.cta),
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || row?.updatedAt || new Date().toISOString(),
  };
}

function toPromoRow(promo: Partial<PromoData> & { id: string; position: PromoPosition }) {
  const normalizedSingleImage = normalizeImagePath(promo.image || "") || "";
  const images = normalizeImagesArray(
    Array.isArray(promo.images) && promo.images.length
      ? promo.images
      : normalizedSingleImage
      ? [normalizedSingleImage]
      : []
  );

  return {
    id: promo.id,
    position: promo.position,
    is_active: promo.isActive ?? false,
    product_id: promo.productId || null,
    image_url: images[0] || null,
    images_json: images,
    title: normalizeLocalizedText(promo.title),
    description: normalizeLocalizedText(promo.description),
    cta: normalizeCta(promo.cta),
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const { data, error } = await supabase.from("promos").select("*");

    if (error) throw error;

    return Response.json(
      (data || [])
        .map(toPromoResponse)
        .filter((promo): promo is PromoData => Boolean(promo))
    );
  } catch (err) {
    console.error("GET PROMOS ERROR:", err);

    return Response.json(
      { error: "Failed to fetch promos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PromoData>;

    if (!body.id || !isPromoPosition(body.position)) {
      return Response.json(
        { error: "Missing required fields: id, position" },
        { status: 400 }
      );
    }

    const promo = {
      ...createEmptyPromo(body.position),
      ...body,
      id: body.id,
      position: body.position,
    };

    const { data, error } = await supabase
      .from("promos")
      .insert([
        {
          ...toPromoRow(promo),
          created_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    return Response.json(toPromoResponse(data), { status: 201 });
  } catch (err) {
    console.error("CREATE PROMO ERROR:", err);

    return Response.json(
      { error: "Failed to create promo" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<PromoData> & { id: string };

    if (!body.id) {
      return Response.json(
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const position = isPromoPosition(body.position) ? body.position : null;

    if (!position) {
      return Response.json(
        { error: "Valid promo position is required" },
        { status: 400 }
      );
    }

    const { data: existingRow } = await supabase
      .from("promos")
      .select("*")
      .eq("id", body.id)
      .maybeSingle();

    const existingPromo = existingRow ? toPromoResponse(existingRow) : null;
    const mergedPromo: PromoData = {
      ...createEmptyPromo(position),
      ...existingPromo,
      ...body,
      id: body.id,
      position,
      title: {
        ...(existingPromo?.title || createEmptyPromo(position).title),
        ...(body.title || {}),
      },
      description: {
        ...(existingPromo?.description || createEmptyPromo(position).description),
        ...(body.description || {}),
      },
      cta: {
        ...(existingPromo?.cta || createEmptyPromo(position).cta),
        ...(body.cta || {}),
      },
      images:
        Array.isArray(body.images) && body.images.length
          ? body.images
          : body.image
          ? [body.image]
          : existingPromo?.images || [],
      image:
        body.image ||
        (Array.isArray(body.images) && body.images[0]) ||
        existingPromo?.image ||
        "",
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("promos")
      .upsert(
        [
          {
            ...toPromoRow(mergedPromo),
            created_at: existingPromo?.createdAt || new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return Response.json(toPromoResponse(data));
  } catch (err) {
    console.error("UPDATE PROMO ERROR:", err);

    return Response.json(
      { error: "Failed to update promo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return Response.json(
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("promos").delete().eq("id", id);

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
