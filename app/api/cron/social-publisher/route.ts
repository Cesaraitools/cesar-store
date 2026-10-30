import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { runPublisherWorker } from "@/lib/server/social-publisher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = String(process.env.CRON_SECRET || "");
  const authorization = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  if (!secret || authorization.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPublisherWorker({ maxPosts: 4 });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("SOCIAL PUBLISHER CRON ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publisher worker failed." },
      { status: 500 }
    );
  }
}
