import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const dynamic = "force-dynamic";

type AutomationLanguage = "ar" | "en";

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

type SearchInput = {
  q?: unknown;
  query?: unknown;
  lang?: unknown;
  limit?: unknown;
};

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return Response.json(data, { ...init, headers });
}

function getAutomationSecret() {
  return process.env.N8N_AUTOMATION_SECRET || "";
}

function isAuthorized(request: Request) {
  const configuredSecret = getAutomationSecret();

  if (!configuredSecret) {
    return { ok: false, status: 503, error: "Automation API is not configured" };
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearerSecret = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = request.headers.get("x-automation-secret") || "";

  if (bearerSecret === configuredSecret || headerSecret === configuredSecret) {
    return { ok: true };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}

function detectLanguage(input: string, requested: string | null): AutomationLanguage {
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

function toAutomationProduct(product: ProductRow, language: AutomationLanguage, baseUrl: string) {
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

function buildSuggestedReply(
  products: ReturnType<typeof toAutomationProduct>[],
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readLimit(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);

  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, 1), 10);
}

async function searchProducts(request: Request, input: SearchInput = {}) {
  const guard = isAuthorized(request);
  if (!guard.ok) {
    return json({ error: guard.error }, { status: guard.status });
  }

  const requestUrl = new URL(request.url);
  const query =
    readString(input.q) ||
    readString(input.query) ||
    (requestUrl.searchParams.get("q") || "").trim();
  const requestedLanguage =
    readString(input.lang) || requestUrl.searchParams.get("lang");
  const language = detectLanguage(query, requestedLanguage);
  const limit = readLimit(input.limit ?? requestUrl.searchParams.get("limit"), 5);
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${requestUrl.protocol}//${requestUrl.host}`
  ).replace(/\/+$/, "");

  if (query.length < 2) {
    return json(
      {
        schemaVersion: 1,
        query,
        language,
        products: [],
        suggestedReply: buildSuggestedReply([], language),
      },
      { status: 400 }
    );
  }

  try {
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

    const matches = ((data || []) as ProductRow[])
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
      .map((item) => toAutomationProduct(item.product, language, baseUrl));

    return json({
      schemaVersion: 1,
      query,
      language,
      products: matches,
      suggestedReply: buildSuggestedReply(matches, language),
      meta: {
        source: "cesar-store",
        count: matches.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("AUTOMATION PRODUCT SEARCH ERROR:", error);

    return json(
      {
        error: "Failed to search products",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return searchProducts(request);
}

export async function POST(request: Request) {
  const guard = isAuthorized(request);
  if (!guard.ok) {
    return json({ error: guard.error }, { status: guard.status });
  }

  try {
    const input = (await request.json()) as SearchInput;

    return searchProducts(request, input);
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
