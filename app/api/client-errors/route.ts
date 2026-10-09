import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 12_000;
const MAX_REPORTS_PER_MINUTE = 10;
const reportWindows = new Map<string, { count: number; resetAt: number }>();

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function isRateLimited(request: NextRequest) {
  const now = Date.now();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientKey = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const current = reportWindows.get(clientKey);

  if (!current || current.resetAt <= now) {
    reportWindows.set(clientKey, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  current.count += 1;
  if (reportWindows.size > 500) {
    for (const [key, value] of reportWindows) {
      if (value.resetAt <= now) reportWindows.delete(key);
    }
  }

  return current.count > MAX_REPORTS_PER_MINUTE;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many reports" }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = text(payload.message, 1_000);
  if (!message) {
    return NextResponse.json({ error: "Missing error message" }, { status: 400 });
  }

  const context =
    payload.context && typeof payload.context === "object"
      ? (payload.context as Record<string, unknown>)
      : {};

  Sentry.captureMessage(`Client error: ${message}`, {
    level: "error",
    tags: {
      reporter: "lightweight-client",
      kind: text(context.kind, 40) || "error",
    },
    extra: {
      name: text(payload.name, 100),
      stack: text(payload.stack, 8_000),
      page: text(payload.page, 500),
      userAgent: text(payload.userAgent, 500),
      source: text(context.source, 500),
      line: typeof context.line === "number" ? context.line : undefined,
      column:
        typeof context.column === "number" ? context.column : undefined,
    },
  });

  return new NextResponse(null, { status: 204 });
}
