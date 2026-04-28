import { NextRequest, NextResponse } from "next/server";
import { ensureMediaAssetForSource } from "@/lib/server/media-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const imageUrl = formData.get("image_url") as string | null;
    const type = formData.get("type") as string | null;

    if (!type) {
      return NextResponse.json({ error: "Missing type" }, { status: 400 });
    }

    if (!file && !imageUrl) {
      return NextResponse.json(
        { error: "Missing image source" },
        { status: 400 }
      );
    }

    const asset = file
      ? await ensureMediaAssetForSource({
          file,
          uploadType: type,
        })
      : await ensureMediaAssetForSource({
          imageUrl: String(imageUrl),
          uploadType: type,
        });

    return NextResponse.json({
      url: asset.url,
      reused: asset.reused,
      hash: asset.hash,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown upload error",
      },
      { status: 400 }
    );
  }
}
