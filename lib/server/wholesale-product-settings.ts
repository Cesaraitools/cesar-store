import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import {
  normalizeProductVariantOptions,
  normalizeProductVariants,
} from "@/lib/product-variants";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type {
  WholesaleCatalogProduct,
  WholesaleProductSetting,
  WholesaleProductSettingProduct,
  WholesaleUnitType,
} from "@/types/wholesale";

export type WholesaleProductSettingInput = {
  productId: string;
  isEnabled: boolean;
  wholesalePrice: number;
  unitType: WholesaleUnitType;
  unitLabel: string;
  quantityPerUnit: number;
  minOrderUnits: number;
  notes?: string | null;
};

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toInteger(value: unknown, fallback = 1) {
  const number = Math.floor(toNumber(value, fallback));
  return Number.isFinite(number) ? number : fallback;
}

function toSetting(row: any): WholesaleProductSetting {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    isEnabled: Boolean(row.is_enabled),
    wholesalePrice: Number(row.wholesale_price || 0),
    unitType: "piece",
    unitLabel: "قطعة",
    quantityPerUnit: 1,
    minOrderUnits: Number(row.min_order_units || 1),
    notes: row.notes || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function toProduct(row: any, setting: WholesaleProductSetting | null): WholesaleProductSettingProduct {
  const rawImages =
    Array.isArray(row?.images_json) && row.images_json.length
      ? row.images_json
      : row?.image_url
      ? [row.image_url]
      : [];
  const images = normalizeImagesArray(rawImages);

  return {
    id: String(row.id),
    name: {
      ar: row.name_ar || "",
      en: row.name_en || row.name_ar || "",
    },
    category: normalizeCategory(row.category || "equipment"),
    retailPrice: Number(row.price || 0),
    stock: Number(row.stock || 0),
    active: Boolean(row.is_active ?? true),
    image: images[0] || null,
    setting,
  };
}

function getProductVariantData(row: any) {
  const variantOptions = normalizeProductVariantOptions(row?.variant_options_json);
  const variants = normalizeProductVariants(row?.variants_json, variantOptions);

  return { variantOptions, variants };
}

function resolveProductStock(row: any) {
  const { variants } = getProductVariantData(row);
  const variantStockTotal = variants.reduce((total, variant) => {
    if (variant.active === false || typeof variant.stock !== "number") return total;
    return total + Math.max(0, Math.floor(variant.stock));
  }, 0);

  return variantStockTotal > 0
    ? variantStockTotal
    : Math.max(0, Number(row?.stock || 0));
}

function toCatalogProduct(
  row: any,
  setting: WholesaleProductSetting | null,
  includePrices: boolean
): WholesaleCatalogProduct {
  const product = toProduct(row, setting);
  const { variantOptions, variants } = getProductVariantData(row);
  const priceVisible = Boolean(includePrices);

  return {
    id: product.id,
    name: product.name,
    description: {
      ar: row.description_ar || "",
      en: row.description_en || row.description_ar || "",
    },
    category: product.category,
    stock: resolveProductStock(row),
    image: product.image,
    priceVisible,
    wholesalePrice: priceVisible ? setting?.wholesalePrice ?? 0 : null,
    unitType: priceVisible ? "piece" : null,
    unitLabel: priceVisible ? "قطعة" : null,
    quantityPerUnit: priceVisible ? 1 : null,
    minOrderUnits: priceVisible ? setting?.minOrderUnits ?? 1 : null,
    notes: priceVisible ? setting?.notes ?? null : null,
    variantOptions,
    variants,
  };
}

function validateInput(input: WholesaleProductSettingInput) {
  const productId = cleanText(input.productId, 80);
  const wholesalePrice = toNumber(input.wholesalePrice);
  const minOrderUnits = toInteger(input.minOrderUnits, 1);

  if (!productId) {
    throw new Error("Missing product id");
  }

  if (wholesalePrice < 0 || minOrderUnits <= 0) {
    throw new Error("Invalid wholesale product values");
  }

  return {
    productId,
    isEnabled: Boolean(input.isEnabled),
    wholesalePrice,
    unitType: "piece" as WholesaleUnitType,
    unitLabel: "قطعة",
    quantityPerUnit: 1,
    minOrderUnits,
    notes: cleanText(input.notes || "", 1000) || null,
  };
}

export async function listWholesaleProductSettings() {
  const supabase = createServiceRoleClient();
  const [{ data: products, error: productsError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name_ar,name_en,category,price,stock,is_active,image_url,images_json,variant_options_json,variants_json,created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("wholesale_product_settings").select("*"),
    ]);

  if (productsError) throw productsError;
  if (settingsError) throw settingsError;

  const settingsByProductId = new Map(
    (settings || []).map((setting) => [String(setting.product_id), toSetting(setting)])
  );

  return (products || []).map((product) =>
    toProduct(product, settingsByProductId.get(String(product.id)) || null)
  );
}

export async function listWholesaleCatalogProducts(options?: {
  includePrices?: boolean;
}) {
  const includePrices = Boolean(options?.includePrices);
  const supabase = createServiceRoleClient();
  const [{ data: products, error: productsError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name_ar,name_en,description_ar,description_en,category,stock,is_active,image_url,images_json,variant_options_json,variants_json,created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("wholesale_product_settings").select("*"),
    ]);

  if (productsError) throw productsError;
  if (settingsError) throw settingsError;

  const settingsByProductId = new Map(
    (settings || []).map((setting) => [String(setting.product_id), toSetting(setting)])
  );

  return (products || [])
    .map((product) => ({
      row: product,
      setting: settingsByProductId.get(String(product.id)) || null,
    }))
    .filter(({ row, setting }) => {
      const active = Boolean(row.is_active ?? true);
      const stock = resolveProductStock(row);
      const wholesaleEnabled = setting?.isEnabled ?? true;

      return active && stock > 0 && wholesaleEnabled;
    })
    .map(({ row, setting }) => toCatalogProduct(row, setting, includePrices));
}

export async function getWholesaleCatalogProductById(
  productId: string,
  options?: { includePrices?: boolean }
) {
  const cleanProductId = cleanText(productId, 80);
  if (!cleanProductId) return null;

  const includePrices = Boolean(options?.includePrices);
  const supabase = createServiceRoleClient();
  const [{ data: product, error: productError }, { data: setting, error: settingError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name_ar,name_en,description_ar,description_en,category,stock,is_active,image_url,images_json,variant_options_json,variants_json,created_at"
        )
        .eq("id", cleanProductId)
        .maybeSingle(),
      supabase
        .from("wholesale_product_settings")
        .select("*")
        .eq("product_id", cleanProductId)
        .maybeSingle(),
    ]);

  if (productError) throw productError;
  if (settingError) throw settingError;
  if (!product) return null;

  const normalizedSetting = setting ? toSetting(setting) : null;
  const active = Boolean(product.is_active ?? true);
  const stock = resolveProductStock(product);
  const wholesaleEnabled = normalizedSetting?.isEnabled ?? true;

  if (!active || stock <= 0 || !wholesaleEnabled) return null;

  return toCatalogProduct(product, normalizedSetting, includePrices);
}

export async function saveWholesaleProductSetting(input: WholesaleProductSettingInput) {
  const validated = validateInput(input);
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("wholesale_product_settings")
    .upsert(
      {
        product_id: validated.productId,
        is_enabled: validated.isEnabled,
        wholesale_price: validated.wholesalePrice,
        unit_type: validated.unitType,
        unit_label: validated.unitLabel,
        quantity_per_unit: validated.quantityPerUnit,
        min_order_units: validated.minOrderUnits,
        notes: validated.notes,
        updated_at: now,
      },
      { onConflict: "product_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toSetting(data);
}
