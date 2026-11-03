import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAdminRole } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const org = "cesar-store";
    const project = "javascript-nextjs";

    const token = process.env.SENTRY_AUTH_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Missing SENTRY_AUTH_TOKEN" },
        { status: 500 }
      );
    }

    const sentryUrl = new URL(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/`
    );
    sentryUrl.searchParams.set("environment", "vercel-production");
    sentryUrl.searchParams.set("query", "is:unresolved");
    sentryUrl.searchParams.set("sort", "date");

    const res = await fetch(sentryUrl, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Sentry data" },
        { status: 500 }
      );
    }

    const data = await res.json();

    const formatted = data.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      culprit: issue.culprit,
      count: Number(issue.count) || 0,
      lastSeen: issue.lastSeen,
      level: issue.level,
    }));

    return NextResponse.json(
      { errors: formatted },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
