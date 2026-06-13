import { answerAutomationQuestion } from "@/lib/server/automation-agent";

export const dynamic = "force-dynamic";

type SearchInput = {
  q?: unknown;
  query?: unknown;
  message?: unknown;
  text?: unknown;
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readLimit(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);

  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, 1), 10);
}

function withAutomationAliases(result: Awaited<ReturnType<typeof answerAutomationQuestion>>) {
  return {
    ...result,
    reply: result.suggestedReply,
    productsCount: result.products.length,
    firstProductUrl: result.products[0]?.productUrl || "",
    firstImageUrl: result.products[0]?.imageUrl || "",
  };
}

async function readSearchInput(request: Request): Promise<SearchInput> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as SearchInput;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  const rawBody = await request.text();
  if (!rawBody.trim()) return {};

  try {
    return JSON.parse(rawBody) as SearchInput;
  } catch {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
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
    readString(input.message) ||
    readString(input.text) ||
    (requestUrl.searchParams.get("message") || "").trim() ||
    (requestUrl.searchParams.get("text") || "").trim() ||
    (requestUrl.searchParams.get("q") || "").trim();
  const requestedLanguage =
    readString(input.lang) || requestUrl.searchParams.get("lang");
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${requestUrl.protocol}//${requestUrl.host}`
  ).replace(/\/+$/, "");

  try {
    const result = await answerAutomationQuestion({
      query,
      requestedLanguage,
      limit: readLimit(input.limit ?? requestUrl.searchParams.get("limit"), 5),
      baseUrl,
    });

    return json(withAutomationAliases(result));
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
    const input = await readSearchInput(request);

    return searchProducts(request, input);
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }
}
