import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { createProductImportJob } from "@/lib/server/product-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!(await validateAdminSession())) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const fileName = String(body?.fileName || "bulk-import.xlsx").trim();

    if (!rows.length) {
      return NextResponse.json(
        { error: "Import rows are required" },
        { status: 400 }
      );
    }

    const job = await createProductImportJob({
      fileName,
      rows,
    });

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create import job",
        details: error instanceof Error ? error.message : "Unknown import error",
      },
      { status: 500 }
    );
  }
}
