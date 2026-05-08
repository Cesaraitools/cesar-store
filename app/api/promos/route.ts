import { createClient } from "@supabase/supabase-js";
import { normalizeImagePath, normalizeImagesArray } from "@/lib/image-normalizer";
import type { Product } from "@/types/product";
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

function normalizeSelectedProductIds(row: any): string[] {
  if (Array.isArray(row?.product_ids_json)) {
    return row.product_ids_json
      .filter((value: unknown) => typeof value === "string")
      .map((value: string) => value.trim())
      .filter(Boolean);
  }

  if (typeof row?.product_id === "string" && row.product_id.trim()) {
    return [row.product_id.trim()];
  }

  if (typeof row?.productId === "string" && row.productId.trim()) {
    return [row.productId.trim()];
  }

  return [];
}

function toProductResponse(product: any): Product {
  const images = normalizeImagesArray(
    Array.isArray(product?.images_json) && product.images_json.length
      ? product.images_json
      : product?.image_url
      ? [product.image_url]
      : []
  );

  return {
    id: String(product.id),
    name: {
      ar: product?.name_ar || "",
      en: product?.name_en || product?.name_ar || "",
    },
    description: {
      ar: product?.description_ar || "",
      en: product?.description_en || product?.description_ar || "",
    },
    price: Number(product?.price ?? 0),
    category: String(product?.category || ""),
    images,
    stock: Number(product?.stock ?? 0),
    active: Boolean(product?.is_active ?? true),
    low_stock_threshold:
      typeof product?.low_stock_threshold === "number"
        ? product.low_stock_threshold
        : 10,
    createdAt: product?.created_at || new Date().toISOString(),
    updatedAt: product?.updated_at || new Date().toISOString(),
  };
}

function mapPromoRow(row: any): PromoData | null {
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
    selectedProductIds: normalizeSelectedProductIds(row),
    products: [],
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
  const selectedProductIds = Array.isArray(promo.selectedProductIds)
    ? promo.selectedProductIds.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : [];

  return {
    id: promo.id,
    position: promo.position,
    is_active: promo.isActive ?? false,
    product_id: selectedProductIds[0] || promo.productId || null,
    product_ids_json: selectedProductIds,
    image_url: images[0] || null,
    images_json: images,
    title: normalizeLocalizedText(promo.title),
    description: normalizeLocalizedText(promo.description),
    cta: normalizeCta(promo.cta),
    updated_at: new Date().toISOString(),
  };
}

async function hydratePromosWithProducts(promos: PromoData[]) {
  const selectedIds = Array.from(
    new Set(promos.flatMap((promo) => promo.selectedProductIds))
  );

  if (!selectedIds.length) {
    return promos;
  }

  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("*")
    .in("id", selectedIds);

  if (productsError) {
    throw productsError;
  }

  const productMap = new Map<string, Product>();

  for (const row of productRows || []) {
    const product = toProductResponse(row);
    productMap.set(product.id, product);
  }

  return promos.map((promo) => ({
    ...promo,
    products: promo.selectedProductIds
      .map((productId) => productMap.get(productId))
      .filter((product): product is Product => Boolean(product)),
  }));
}

export async function GET() {
  try {
    const { data, error } = await supabase.from("promos").select("*");

    if (error) throw error;

    const promos = (data || [])
      .map(mapPromoRow)
      .filter((promo): promo is PromoData => Boolean(promo));

    return Response.json(await hydratePromosWithProducts(promos));
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

    const mappedPromo = mapPromoRow(data);

    return Response.json(
      mappedPromo ? (await hydratePromosWithProducts([mappedPromo]))[0] : null,
      { status: 201 }
    );
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

    const existingPromo = existingRow ? mapPromoRow(existingRow) : null;
    const mergedPromo: PromoData = {
      ...createEmptyPromo(position),
      ...existingPromo,
      ...body,
      id: body.id,
      position,
      selectedProductIds:
        Array.isArray(body.selectedProductIds)
          ? body.selectedProductIds
          : existingPromo?.selectedProductIds || [],
      products: existingPromo?.products || [],
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

    let data = null;
let error = null;

if (existingPromo) {
  const response = await supabase
    .from("promos")
    .update({
      ...toPromoRow(mergedPromo),
    })
    .eq("id", body.id)
    .select("*")
    .single();

  data = response.data;
  error = response.error;
} else {
  const response = await supabase
    .from("promos")
    .insert([
      {
        ...toPromoRow(mergedPromo),
        created_at: new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  data = response.data;
  error = response.error;
}

    if (error) throw error;

    const mappedPromo = mapPromoRow(data);

    return Response.json(
      mappedPromo ? (await hydratePromosWithProducts([mappedPromo]))[0] : null
    );
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
