import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return NextResponse.json(
        { error: "Missing file or type" },
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

    /* 🔥 DEBUG STEP */
    if (!file.name) {
      throw new Error("File has no name");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${crypto.randomUUID()}${ext}`;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      `${type}s`
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);

    /* 🔥 DEBUG STEP */
    if (!uploadDir.includes("public")) {
      throw new Error("Invalid upload path");
    }

    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${type}s/${fileName}`;

    return NextResponse.json({ url });

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