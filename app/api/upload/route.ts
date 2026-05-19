import { NextRequest, NextResponse } from "next/server";
import { ensureMediaAssetForSource } from "@/lib/server/media-assets";
import { requireAdminRole } from "@/lib/admin/permissions";

function isSafeImageUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // منع localhost/internal
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;
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

if (imageUrl && !isSafeImageUrl(imageUrl)) {
  return NextResponse.json(
    { error: "Invalid image URL" },
    { status: 400 }
  );
}

    const asset = file
      ? await ensureMediaAssetForSource({
          file,
          uploadType: type,
        })
      : await ensureMediaAssetForSource({
          appOrigin: req.nextUrl.origin,
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
