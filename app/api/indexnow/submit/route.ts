import { getActiveProducts } from "@/lib/server/catalog";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const INDEXNOW_KEY = "0f4bc9d8b1d94db1a6f6e3a71957c8d2";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10000;

type SubmitInput = {
  urls?: unknown;
};

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return Response.json(data, { ...init, headers });
}

function getSubmitSecret() {
  return process.env.INDEXNOW_SUBMIT_SECRET || process.env.N8N_AUTOMATION_SECRET || "";
}

function isAuthorized(request: Request) {
  const configuredSecret = getSubmitSecret();

  if (!configuredSecret) {
    return { ok: false, status: 503, error: "IndexNow submit API is not configured" };
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearerSecret = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = request.headers.get("x-indexnow-secret") || "";

  if (bearerSecret === configuredSecret || headerSecret === configuredSecret) {
    return { ok: true };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}

function siteOrigin() {
  return new URL(SITE_URL).origin.replace(/\/+$/, "");
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const origin = siteOrigin();
    const url = new URL(value.trim(), origin);
    const siteHost = new URL(origin).hostname.replace(/^www\./, "");
    const urlHost = url.hostname.replace(/^www\./, "");

    if (siteHost !== urlHost) return null;

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeUrls(values: unknown) {
  const input = Array.isArray(values) ? values : typeof values === "string" ? [values] : [];
  const urls = input.map(normalizeUrl).filter(Boolean) as string[];

  return Array.from(new Set(urls)).slice(0, MAX_URLS);
}

async function readInput(request: Request): Promise<SubmitInput> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as SubmitInput;
  }

  const text = await request.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as SubmitInput;
  } catch {
    return {
      urls: text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }
}

async function getDefaultUrls() {
  const origin = siteOrigin();
  const products = await getActiveProducts(MAX_URLS - 4);
  const urls = [
    `${origin}/`,
    `${origin}/shop`,
    `${origin}/categories`,
    `${origin}/sitemap.xml`,
    ...products.map((product) => `${origin}/product/${product.id}`),
  ];

  return Array.from(new Set(urls)).slice(0, MAX_URLS);
}

async function submitUrls(urls: string[]) {
  const origin = siteOrigin();
  const { hostname } = new URL(origin);
  const payload = {
    host: hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    responseText,
  };
}

export async function POST(request: Request) {
  const guard = isAuthorized(request);
  if (!guard.ok) {
    return json({ error: guard.error }, { status: guard.status });
  }

  try {
    const input = await readInput(request);
    const explicitUrls = normalizeUrls(input.urls);
    const urls = explicitUrls.length ? explicitUrls : await getDefaultUrls();
    const result = await submitUrls(urls);

    return json(
      {
        submitted: result.ok,
        status: result.status,
        urlsCount: urls.length,
        responseText: result.responseText,
      },
      { status: result.ok ? 200 : 502 }
    );
  } catch (error) {
    console.error("INDEXNOW SUBMIT ERROR:", error);

    return json({ error: "Failed to submit IndexNow URLs" }, { status: 500 });
  }
}
