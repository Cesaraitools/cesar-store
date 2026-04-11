// =====================================================
// Upload API (Smart Dedup Version)
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
   Helpers
========================= */

async function getAllExistingImages(): Promise<string[]> {
  const { data } = await supabase
    .from("products")
    .select("images_json");

  const images: string[] = [];

  data?.forEach((p: any) => {
    if (Array.isArray(p.images_json)) {
      p.images_json.forEach((img: string) => {
        images.push(img);
      });
    }
  });

  return images;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/* =========================
   API
========================= */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return NextResponse.json(
        { error: "Missing file/type" },
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
       🔥 STEP 1: Check duplicates
    ========================= */

    const existingImages = await getAllExistingImages();

    const incomingBase64 = await fileToBase64(file);

    for (const url of existingImages) {
      try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const existingBase64 = Buffer.from(buffer).toString("base64");

        if (existingBase64 === incomingBase64) {
          console.log("♻️ REUSED IMAGE:", url);

          return NextResponse.json({
            url,
            reused: true,
          });
        }
      } catch {
        continue;
      }
    }

    /* =========================
       STEP 2: Upload new image
    ========================= */

    const bytes = await file.arrayBuffer();
    const fileData = new Uint8Array(bytes);

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${type}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("upload")
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Upload failed", details: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from("upload")
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: data.publicUrl,
      reused: false,
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}