import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await validateAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = "cesar-store";
    const project = "javascript-nextjs";

    const token = process.env.SENTRY_AUTH_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Missing SENTRY_AUTH_TOKEN" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

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
      count: issue.count,
      lastSeen: issue.lastSeen,
      level: issue.level,
    }));

    return NextResponse.json({ errors: formatted });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
