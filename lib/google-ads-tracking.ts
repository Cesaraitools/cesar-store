"use client";

type GoogleEcommerceItemInput = {
  id?: string | number | null;
  product_id?: string | number | null;
  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  price?: number | string | null;
  quantity?: number | string | null;
  category?: string | null;
  variant_key?: string | null;
  variant?: {
    key?: string | null;
    label_ar?: string | null;
    label_en?: string | null;
  } | null;
};

type GoogleEcommerceItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
};

type GtagCommand = "js" | "config" | "event";

type MetaPixelEventOptions = {
  eventID?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: GtagCommand,
      target: string | Date,
      params?: Record<string, unknown>
    ) => void;
    fbq?: (
      command: "track",
      eventName: string,
      params?: Record<string, unknown>,
      options?: MetaPixelEventOptions
    ) => void;
  }
}

const DEFAULT_CURRENCY = "EGP";

function normalizeNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function getItemName(item: GoogleEcommerceItemInput) {
  return item.name_ar || item.name_en || item.name || "Cesar Store product";
}

function getItemId(item: GoogleEcommerceItemInput) {
  return String(item.product_id || item.id || getItemName(item));
}

function getCatalogItemId(item: GoogleEcommerceItemInput) {
  const itemId = item.product_id ?? item.id;
  if (itemId === null || itemId === undefined) return null;

  const normalizedItemId = String(itemId).trim();
  return normalizedItemId || null;
}

function getItemVariant(item: GoogleEcommerceItemInput) {
  return (
    item.variant?.label_ar ||
    item.variant?.label_en ||
    item.variant?.key ||
    item.variant_key ||
    undefined
  );
}

function toGoogleItem(item: GoogleEcommerceItemInput): GoogleEcommerceItem {
  const googleItem: GoogleEcommerceItem = {
    item_id: getItemId(item),
    item_name: getItemName(item),
  };
  const price = normalizeNumber(item.price);
  const quantity = normalizeNumber(item.quantity);
  const variant = getItemVariant(item);

  if (typeof price === "number") googleItem.price = price;
  if (typeof quantity === "number") googleItem.quantity = quantity;
  if (item.category) googleItem.item_category = item.category;
  if (variant) googleItem.item_variant = variant;

  return googleItem;
}

function getPurchaseConversionTarget() {
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL;
  const explicitAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const tagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
  const adsId = explicitAdsId || (tagId?.startsWith("AW-") ? tagId : undefined);

  return adsId && label ? `${adsId}/${label}` : null;
}

function gtagEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  try {
    window.gtag("event", eventName, params);
  } catch (error) {
    console.warn("Google Ads tracking event failed", eventName, error);
  }
}

function metaPixelEvent(
  eventName: string,
  params: Record<string, unknown>,
  options?: MetaPixelEventOptions
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  try {
    window.fbq("track", eventName, params, options);
  } catch (error) {
    console.warn("Meta Pixel tracking event failed", eventName, error);
  }
}

function getMetaProductParams(item: GoogleEcommerceItemInput) {
  const contentId = getCatalogItemId(item);
  if (!contentId) return null;

  const price = normalizeNumber(item.price);
  const params: Record<string, unknown> = {
    content_ids: [contentId],
    content_type: "product",
    content_name: getItemName(item),
    currency: DEFAULT_CURRENCY,
  };

  if (typeof price === "number") params.value = price;
  if (item.category) params.content_category = item.category;

  return params;
}

function getMetaCartParams(
  items: GoogleEcommerceItemInput[],
  value: number
) {
  const contents = items.flatMap((item) => {
    const id = getCatalogItemId(item);
    if (!id) return [];

    const quantity = normalizeNumber(item.quantity) ?? 1;
    const price = normalizeNumber(item.price);

    return [
      {
        id,
        quantity,
        ...(typeof price === "number" ? { item_price: price } : {}),
      },
    ];
  });

  if (!contents.length) return null;

  return {
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    contents,
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
    currency: DEFAULT_CURRENCY,
    value,
  };
}

export function trackViewItem(item: GoogleEcommerceItemInput) {
  const googleItem = toGoogleItem({ ...item, quantity: item.quantity ?? 1 });

  gtagEvent("view_item", {
    currency: DEFAULT_CURRENCY,
    value: googleItem.price,
    items: [googleItem],
  });

  const metaParams = getMetaProductParams(item);
  if (metaParams) metaPixelEvent("ViewContent", metaParams);
}

export function trackAddToCart(item: GoogleEcommerceItemInput) {
  const googleItem = toGoogleItem({ ...item, quantity: item.quantity ?? 1 });

  gtagEvent("add_to_cart", {
    currency: DEFAULT_CURRENCY,
    value: googleItem.price,
    items: [googleItem],
  });

  const metaParams = getMetaProductParams(item);
  if (metaParams) metaPixelEvent("AddToCart", metaParams);
}

export function trackBeginCheckout(
  items: GoogleEcommerceItemInput[],
  value: number
) {
  if (!items.length) return;

  gtagEvent("begin_checkout", {
    currency: DEFAULT_CURRENCY,
    value,
    items: items.map(toGoogleItem),
  });

  const metaParams = getMetaCartParams(items, value);
  if (metaParams) metaPixelEvent("InitiateCheckout", metaParams);
}

export function trackPurchase({
  transactionId,
  value,
  items,
}: {
  transactionId: string;
  value: number;
  items: GoogleEcommerceItemInput[];
}) {
  if (!transactionId || !items.length) return;

  const googleItems = items.map(toGoogleItem);

  gtagEvent("purchase", {
    transaction_id: transactionId,
    currency: DEFAULT_CURRENCY,
    value,
    items: googleItems,
  });

  const metaParams = getMetaCartParams(items, value);
  if (metaParams) {
    metaPixelEvent("Purchase", metaParams, { eventID: transactionId });
  }

  const conversionTarget = getPurchaseConversionTarget();
  if (!conversionTarget) return;

  gtagEvent("conversion", {
    send_to: conversionTarget,
    value,
    currency: DEFAULT_CURRENCY,
    transaction_id: transactionId,
  });
}
