import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  getProductImportJob,
  processProductImportJob,
} from "@/lib/server/product-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const job = await getProductImportJob(params.jobId);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch import job",
        details: error instanceof Error ? error.message : "Unknown import error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

    const job = await processProductImportJob(params.jobId, req.nextUrl.origin);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process import job",
        details: error instanceof Error ? error.message : "Unknown import error",
      },
      { status: 500 }
    );
  }
}
