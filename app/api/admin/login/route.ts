import { NextResponse } from "next/server";
import crypto from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1"; // ← Session Version الحالي

// ⏱️ 8 ساعات
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  try {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
      return NextResponse.json(
        { error: "Admin credentials are not configured" },
        { status: 500 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const incomingHash = hashPassword(password);

    if (incomingHash.length !== ADMIN_PASSWORD_HASH.length) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidUser =
      username === ADMIN_USERNAME &&
      crypto.timingSafeEqual(
        Buffer.from(incomingHash),
        Buffer.from(ADMIN_PASSWORD_HASH)
      );

    if (!isValidUser) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sessionToken = crypto.randomUUID();

    const response = NextResponse.json({ success: true });

    // 🧠 Cookie تحمل Version + Token
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: `${SESSION_VERSION}:${sessionToken}`,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
      expires: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}