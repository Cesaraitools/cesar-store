import { NextResponse } from "next/server";
import crypto from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET!;

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

// ⏱️ 8 ساعات
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function signToken(token: string) {
  return crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !ADMIN_SESSION_SECRET) {
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

    const token = crypto.randomUUID();
    const signature = signToken(token);

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: `${SESSION_VERSION}:${token}.${signature}`,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}