// =====================================================
// Upload API (Supabase Storage Version)
// Cesar Store
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

/* =========================
   Supabase Client
========================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* =========================
   API
========================= */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const type = formData.get("type") as string | null;

    // ✅ Validation (محسّن بدون تكرار)
    if (!file || typeof file === "string" || !type) {
      return NextResponse.json(
        { error: "Missing or invalid file/type" },
        { status: 400 }
      );
    }

    if (!["category", "product", "promo"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid upload type" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    /* =========================
       Prepare File (مرة واحدة فقط)
    ========================= */

    const bytes = await file.arrayBuffer();
    const fileData = new Uint8Array(bytes);

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${type}/${crypto.randomUUID()}.${ext}`;

    /* =========================
       Upload to Supabase
    ========================= */

    const { error: uploadError } = await supabase.storage
      .from("upload")
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("SUPABASE UPLOAD ERROR:", uploadError);
      return NextResponse.json(
        { error: "Upload failed", details: uploadError.message },
        { status: 500 }
      );
    }

    /* =========================
       Get Public URL
    ========================= */

    const { data } = supabase.storage
      .from("upload")
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: data.publicUrl,
    });

  } catch (err) {
    console.error("UPLOAD ERROR FULL:", err);

    return NextResponse.json(
      {
        error: "Upload failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}