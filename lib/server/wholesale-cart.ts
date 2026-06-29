import { createServiceRoleClient } from "@/lib/supabase/runtime";
import { getWholesaleCustomerForAuthUser } from "@/lib/server/wholesale-applications";
import {
  createVariantSnapshot,
  normalizeProductVariantOptions,
  normalizeProductVariants,
} from "@/lib/product-variants";
import type { ProductVariantSnapshot } from "@/types/product";
import type { WholesaleCartItem } from "@/types/wholesale";

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function toInteger(value: unknown, fallback = 1) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? number : fallback;
}

function normalizeVariantKey(value: unknown) {
  return cleanText(value, 240);
}

function normalizeVariantSnapshot(value: unknown): ProductVariantSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<ProductVariantSnapshot>;
  const key = normalizeVariantKey(raw.key);
  const selectedOptions = Array.isArray(raw.selected_options)
    ? raw.selected_options
    : [];

  if (!key || selectedOptions.length === 0) return null;

  return {
    key,
    label_ar: cleanText(raw.label_ar, 500),
    label_en: cleanText(raw.label_en, 500),
    selected_options: selectedOptions.map((option) => ({
      option_id: cleanText((option as any)?.option_id, 120),
      option_name_ar: cleanText((option as any)?.option_name_ar, 120),
      option_name_en: cleanText((option as any)?.option_name_en, 120),
      value_id: cleanText((option as any)?.value_id, 120),
      value_ar: cleanText((option as any)?.value_ar, 120),
      value_en: cleanText((option as any)?.value_en, 120),
    })),
  };
}

function getCartItemKey(productId: string, variantKey = "") {
  return `${productId}::${normalizeVariantKey(variantKey)}`;
}

function normalizeCartItems(input: unknown): WholesaleCartItem[] {
  if (!Array.isArray(input)) return [];

  const merged = new Map<string, WholesaleCartItem>();

  for (const rawItem of input) {
    const productId = cleanText((rawItem as WholesaleCartItem)?.productId, 80);
    const variantKey = normalizeVariantKey(
      (rawItem as WholesaleCartItem)?.variantKey
    );
    const variant = normalizeVariantSnapshot(
      (rawItem as WholesaleCartItem)?.variant
    );
    const orderedUnits = toInteger(
      (rawItem as WholesaleCartItem)?.orderedUnits,
      0
    );

    if (!productId || orderedUnits <= 0) continue;

    const itemKey = getCartItemKey(productId, variantKey);
    const existing = merged.get(itemKey);
    merged.set(itemKey, {
      productId,
      variantKey,
      variant: variant || existing?.variant || null,
      orderedUnits: (existing?.orderedUnits || 0) + orderedUnits,
    });
  }

  return Array.from(merged.values());
}

async function getActiveWholesaleCustomer(authUserId: string) {
  const customer = await getWholesaleCustomerForAuthUser(authUserId);

  if (!customer || customer.status !== "active") {
    throw new Error("يجب تفعيل حساب الجملة قبل استخدام سلة الجملة");
  }

  return customer;
}

async function getOrCreateWholesaleCart(authUserId: string) {
  const customer = await getActiveWholesaleCustomer(authUserId);
  const supabase = createServiceRoleClient();

  const { data: existingCart, error: fetchError } = await supabase
    .from("wholesale_carts")
    .select("*")
    .eq("wholesale_customer_id", customer.id)
    .eq("status", "active")
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existingCart) return existingCart;

  const { data: cart, error: createError } = await supabase
    .from("wholesale_carts")
    .insert({
      wholesale_customer_id: customer.id,
      auth_user_id: authUserId,
      status: "active",
    })
    .select("*")
    .single();

  if (createError?.code === "23505") {
    const { data: retryCart, error: retryError } = await supabase
      .from("wholesale_carts")
      .select("*")
      .eq("wholesale_customer_id", customer.id)
      .eq("status", "active")
      .maybeSingle();

    if (retryError) throw retryError;
    if (retryCart) return retryCart;
  }

  if (createError) throw createError;
  return cart;
}

async function getActiveWholesaleCart(authUserId: string) {
  const customer = await getActiveWholesaleCustomer(authUserId);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("wholesale_carts")
    .select("*")
    .eq("wholesale_customer_id", customer.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function validateWholesaleCartQuantity(
  productId: string,
  orderedUnits: number,
  rawVariantKey = "",
  rawVariantSnapshot: unknown = null
) {
  const supabase = createServiceRoleClient();
  const [{ data: product, error: productError }, { data: setting, error: settingError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id,name_ar,name_en,stock,is_active,variant_options_json,variants_json")
        .eq("id", productId)
        .maybeSingle(),
      supabase
        .from("wholesale_product_settings")
        .select("is_enabled,wholesale_price,min_order_units")
        .eq("product_id", productId)
        .maybeSingle(),
    ]);

  if (productError) throw productError;
  if (settingError) throw settingError;

  if (!product || product.is_active === false) {
    throw new Error("هذا المنتج غير متاح حاليا في الجملة");
  }

  if (setting?.is_enabled === false) {
    throw new Error("هذا المنتج غير مفعل للبيع بالجملة حاليا");
  }

  const productName = product.name_ar || product.name_en || "هذا المنتج";
  const wholesalePrice = Number(setting?.wholesale_price || 0);
  const minOrderUnits = Math.max(1, toInteger(setting?.min_order_units, 1));
  const variantOptions = normalizeProductVariantOptions(product.variant_options_json);
  const variants = normalizeProductVariants(product.variants_json, variantOptions);
  const hasVariants = variantOptions.length > 0 && variants.length > 0;
  const variantKey = hasVariants ? normalizeVariantKey(rawVariantKey) : "";
  const matchedVariant = hasVariants
    ? variants.find((variant) => variant.key === variantKey && variant.active !== false)
    : null;
  const variantSnapshot = hasVariants
    ? normalizeVariantSnapshot(rawVariantSnapshot) ||
      (matchedVariant
        ? createVariantSnapshot(variantOptions, matchedVariant.selections)
        : null)
    : null;
  const stock = hasVariants
    ? Math.max(
        0,
        typeof matchedVariant?.stock === "number"
          ? Math.floor(matchedVariant.stock)
          : toInteger(product.stock, 0)
      )
    : Math.max(0, toInteger(product.stock, 0));

  if (wholesalePrice <= 0) {
    throw new Error(`لم يتم تحديد سعر جملة للمنتج "${productName}"`);
  }

  if (hasVariants && !matchedVariant) {
    throw new Error(`اختيار المنتج "${productName}" غير متاح حاليًا`);
  }

  if (!hasVariants && orderedUnits < minOrderUnits) {
    throw new Error(
      `أقل كمية شراء للمنتج "${productName}" هي ${minOrderUnits} قطعة`
    );
  }

  if (stock < orderedUnits) {
    throw new Error(
      `الكمية المتاحة حاليا من المنتج "${productName}" هي ${stock} قطعة فقط`
    );
  }
  return {
    hasVariants,
    variantKey,
    variant: variantSnapshot,
    minOrderUnits,
  };
}

export async function listWholesaleCartItems(authUserId: string) {
  const cart = await getActiveWholesaleCart(authUserId);
  if (!cart) return [];

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_cart_items")
    .select("product_id,variant_key,variant_snapshot,ordered_units,created_at")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((item) => ({
    productId: String(item.product_id),
    variantKey: normalizeVariantKey(item.variant_key),
    variant: normalizeVariantSnapshot(item.variant_snapshot),
    orderedUnits: Number(item.ordered_units || 0),
  })) satisfies WholesaleCartItem[];
}

export async function addWholesaleCartItem(input: {
  authUserId: string;
  productId: string;
  orderedUnits: number;
  variantKey?: string;
  variant?: ProductVariantSnapshot | null;
}) {
  const productId = cleanText(input.productId, 80);
  const variantKey = normalizeVariantKey(input.variantKey);
  const addUnits = toInteger(input.orderedUnits, 0);

  if (!productId || addUnits <= 0) {
    throw new Error("بيانات صنف سلة الجملة غير صحيحة");
  }

  const cart = await getOrCreateWholesaleCart(input.authUserId);
  const supabase = createServiceRoleClient();
  const { data: existingItem, error: existingError } = await supabase
    .from("wholesale_cart_items")
    .select("id,ordered_units")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .eq("variant_key", variantKey)
    .maybeSingle();

  if (existingError) throw existingError;

  const nextUnits = Number(existingItem?.ordered_units || 0) + addUnits;
  const validation = await validateWholesaleCartQuantity(
    productId,
    nextUnits,
    variantKey,
    input.variant
  );

  if (existingItem) {
    const { error } = await supabase
      .from("wholesale_cart_items")
      .update({
        ordered_units: nextUnits,
        variant_snapshot: validation.variant,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingItem.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("wholesale_cart_items").insert({
      cart_id: cart.id,
      product_id: productId,
      variant_key: validation.variantKey,
      variant_snapshot: validation.variant,
      ordered_units: nextUnits,
    });

    if (error) throw error;
  }

  return listWholesaleCartItems(input.authUserId);
}

export async function updateWholesaleCartItem(input: {
  authUserId: string;
  productId: string;
  orderedUnits: number;
  variantKey?: string;
}) {
  const productId = cleanText(input.productId, 80);
  const variantKey = normalizeVariantKey(input.variantKey);
  const orderedUnits = toInteger(input.orderedUnits, 0);
  const cart = await getActiveWholesaleCart(input.authUserId);

  if (!cart || !productId) return listWholesaleCartItems(input.authUserId);

  if (orderedUnits <= 0) {
    return removeWholesaleCartItem({
      authUserId: input.authUserId,
      productId,
      variantKey,
    });
  }

  await validateWholesaleCartQuantity(productId, orderedUnits, variantKey);

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("wholesale_cart_items")
    .update({
      ordered_units: orderedUnits,
      updated_at: new Date().toISOString(),
    })
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .eq("variant_key", variantKey);

  if (error) throw error;

  return listWholesaleCartItems(input.authUserId);
}

export async function replaceWholesaleCartItems(input: {
  authUserId: string;
  items: unknown;
}) {
  const cart = await getOrCreateWholesaleCart(input.authUserId);
  const items = normalizeCartItems(input.items);
  const supabase = createServiceRoleClient();

  for (const item of items) {
    await validateWholesaleCartQuantity(
      item.productId,
      item.orderedUnits,
      item.variantKey,
      item.variant
    );
  }

  const { error: deleteError } = await supabase
    .from("wholesale_cart_items")
    .delete()
    .eq("cart_id", cart.id);

  if (deleteError) throw deleteError;

  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from("wholesale_cart_items")
      .insert(
        items.map((item) => ({
          cart_id: cart.id,
          product_id: item.productId,
          variant_key: normalizeVariantKey(item.variantKey),
          variant_snapshot: normalizeVariantSnapshot(item.variant),
          ordered_units: item.orderedUnits,
        }))
      );

    if (insertError) throw insertError;
  }

  return listWholesaleCartItems(input.authUserId);
}

export async function removeWholesaleCartItem(input: {
  authUserId: string;
  productId: string;
  variantKey?: string;
}) {
  const cart = await getActiveWholesaleCart(input.authUserId);
  const productId = cleanText(input.productId, 80);
  const variantKey = normalizeVariantKey(input.variantKey);

  if (!cart || !productId) return [];

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("wholesale_cart_items")
    .delete()
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .eq("variant_key", variantKey);

  if (error) throw error;

  return listWholesaleCartItems(input.authUserId);
}

export async function clearWholesaleCart(authUserId: string) {
  const cart = await getActiveWholesaleCart(authUserId);

  if (!cart) return [];

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("wholesale_cart_items")
    .delete()
    .eq("cart_id", cart.id);

  if (error) throw error;

  return [];
}

export async function markWholesaleCartSubmitted(authUserId: string) {
  const cart = await getActiveWholesaleCart(authUserId);

  if (!cart) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("wholesale_carts")
    .update({
      status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cart.id);

  if (error) throw error;
}
