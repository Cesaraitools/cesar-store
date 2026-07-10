import { NextResponse } from "next/server";

import { requireAdminRole } from "@/lib/admin/permissions";
import {
  getDefaultIndexNowUrls,
  normalizeIndexNowUrls,
  submitIndexNowUrls,
} from "@/lib/server/indexnow";

export const dynamic = "force-dynamic";

type SubmitInput = {
  urls?: unknown;
};

async function readInput(request: Request): Promise<SubmitInput> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as SubmitInput;
  }

  return {};
}

export async function POST(request: Request) {
  const guard = await requireAdminRole(["full"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const input = await readInput(request);
    const explicitUrls = normalizeIndexNowUrls(input.urls);
    const urls = explicitUrls.length ? explicitUrls : await getDefaultIndexNowUrls();
    const result = await submitIndexNowUrls(urls);

    return NextResponse.json(
      {
        submitted: result.ok,
        status: result.status,
        urlsCount: urls.length,
        responseText: result.responseText,
      },
      {
        status: result.ok ? 200 : 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("ADMIN INDEXNOW SUBMIT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to submit IndexNow URLs" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
