import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export type AutomationLanguage = "ar" | "en";

type ProductRow = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number | string | null;
  image_url: string | null;
  images_json: unknown;
  stock: number | null;
  category: string | null;
  is_active: boolean | null;
  low_stock_threshold: number | null;
};

export type AutomationProduct = {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  price: number;
  currency: "EGP";
  category: string;
  productUrl: string;
  imageUrl: string;
  images: string[];
  isAvailable: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  stock: number;
  lowStockThreshold: number;
};

export type AutomationProductSearchResult = {
  schemaVersion: 1;
  query: string;
  language: AutomationLanguage;
  products: AutomationProduct[];
  suggestedReply: string;
  meta: {
    source: "cesar-store";
    count: number;
    generatedAt: string;
  };
};

export function detectAutomationLanguage(
  input: string,
  requested: string | null
): AutomationLanguage {
  if (requested === "ar" || requested === "en") return requested;

  return /[\u0600-\u06ff]/.test(input) ? "ar" : "en";
}

function normalizeSearchText(input: string) {
  return input
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0625\u0623\u0622\u0627]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string) {
  return normalizeSearchText(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function scoreProduct(product: ProductRow, query: string, tokens: string[]) {
  const normalizedQuery = normalizeSearchText(query);
  const nameText = normalizeSearchText(
    `${product.name_ar || ""} ${product.name_en || ""}`
  );
  const descriptionText = normalizeSearchText(
    `${product.description_ar || ""} ${product.description_en || ""}`
  );
  const categoryText = normalizeSearchText(normalizeCategory(product.category || ""));
  const haystack = `${nameText} ${descriptionText} ${categoryText}`;

  let score = 0;

  if (normalizedQuery && nameText.includes(normalizedQuery)) score += 12;
  if (normalizedQuery && haystack.includes(normalizedQuery)) score += 4;

  for (const token of tokens) {
    if (nameText.includes(token)) score += 4;
    else if (descriptionText.includes(token)) score += 2;
    else if (categoryText.includes(token)) score += 1;
  }

  if (tokens.length && tokens.every((token) => haystack.includes(token))) {
    score += 3;
  }

  if (Number(product.stock || 0) > 0) score += 1;

  return score;
}

function absoluteUrl(pathOrUrl: string, baseUrl: string) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, baseUrl).toString();
}

function toAutomationProduct(
  product: ProductRow,
  language: AutomationLanguage,
  baseUrl: string
): AutomationProduct {
  const images = normalizeImagesArray(
    Array.isArray(product.images_json) && product.images_json.length
      ? (product.images_json as string[])
      : product.image_url
      ? [product.image_url]
      : []
  ).map((image) => absoluteUrl(image, baseUrl));
  const stock = Number(product.stock || 0);
  const lowStockThreshold =
    typeof product.low_stock_threshold === "number" ? product.low_stock_threshold : 10;
  const isAvailable = Boolean(product.is_active) && stock > 0;
  const stockStatus = !isAvailable
    ? "out_of_stock"
    : stock <= lowStockThreshold
    ? "low_stock"
    : "in_stock";
  const name =
    language === "ar"
      ? product.name_ar || product.name_en || ""
      : product.name_en || product.name_ar || "";
  const description =
    language === "ar"
      ? product.description_ar || product.description_en || ""
      : product.description_en || product.description_ar || "";

  return {
    id: product.id,
    name,
    nameAr: product.name_ar || "",
    nameEn: product.name_en || product.name_ar || "",
    description,
    price: Number(product.price || 0),
    currency: "EGP",
    category: normalizeCategory(product.category || ""),
    productUrl: absoluteUrl(`/product/${product.id}`, baseUrl),
    imageUrl: images[0] || "",
    images,
    isAvailable,
    stockStatus,
    stock,
    lowStockThreshold,
  };
}

export function buildAutomationSuggestedReply(
  products: AutomationProduct[],
  language: AutomationLanguage
) {
  const first = products[0];

  if (!first) {
    return language === "ar"
      ? "\u0645\u0646 \u0641\u0636\u0644\u0643 \u0627\u0631\u0633\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c \u0627\u0648 \u0635\u0648\u0631\u0629 \u0644\u0647."
      : "Could you share the product name or send a photo?";
  }

  if (!first.isAvailable) {
    return language === "ar"
      ? `${first.name} \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631 \u062d\u0627\u0644\u064a\u0627. \u062a\u062d\u0628 \u0627\u0631\u0634\u062d \u0644\u0643 \u0628\u062f\u064a\u0644\u061f`
      : `${first.name} is currently out of stock. Would you like an alternative?`;
  }

  return language === "ar"
    ? `${first.name} \u0645\u062a\u0648\u0641\u0631 \u062d\u0627\u0644\u064a\u0627 \u0628\u0633\u0639\u0631 ${first.price} \u062c\u0646\u064a\u0647. \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0647\u0646\u0627: ${first.productUrl}`
    : `${first.name} is available for EGP ${first.price}. You can view it and complete your order here: ${first.productUrl}`;
}

export async function searchAutomationProducts(input: {
  query: string;
  requestedLanguage?: string | null;
  limit?: number;
  baseUrl: string;
}): Promise<AutomationProductSearchResult> {
  const query = input.query.trim();
  const language = detectAutomationLanguage(query, input.requestedLanguage || null);
  const limit = Math.min(Math.max(Number(input.limit || 5), 1), 10);

  if (query.length < 2) {
    return {
      schemaVersion: 1,
      query,
      language,
      products: [],
      suggestedReply: buildAutomationSuggestedReply([], language),
      meta: {
        source: "cesar-store",
        count: 0,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  const tokens = tokenize(query);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name_ar,name_en,description_ar,description_en,price,image_url,images_json,stock,category,is_active,low_stock_threshold"
    )
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name_ar", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  const products = ((data || []) as ProductRow[])
    .map((product) => ({
      product,
      score: scoreProduct(product, query, tokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      return Number(b.product.stock || 0) - Number(a.product.stock || 0);
    })
    .slice(0, limit)
    .map((item) => toAutomationProduct(item.product, language, input.baseUrl));

  return {
    schemaVersion: 1,
    query,
    language,
    products,
    suggestedReply: buildAutomationSuggestedReply(products, language),
    meta: {
      source: "cesar-store",
      count: products.length,
      generatedAt: new Date().toISOString(),
    },
  };
}
