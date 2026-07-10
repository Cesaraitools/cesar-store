import {
  getDefaultIndexNowUrls,
  normalizeIndexNowUrls,
  submitIndexNowUrls,
} from "@/lib/server/indexnow";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  const guard = isAuthorized(request);
  if (!guard.ok) {
    return json({ error: guard.error }, { status: guard.status });
  }

  try {
    const input = await readInput(request);
    const explicitUrls = normalizeIndexNowUrls(input.urls);
    const urls = explicitUrls.length ? explicitUrls : await getDefaultIndexNowUrls();
    const result = await submitIndexNowUrls(urls);

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
