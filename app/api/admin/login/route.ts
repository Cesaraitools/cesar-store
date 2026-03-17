import { NextResponse } from "next/server";
import crypto from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

const SESSION_VERSION = "v1";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function signToken(token: string) {
  if (!ADMIN_SESSION_SECRET) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }

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

    const sessionToken = crypto.randomUUID();
    const signature = signToken(sessionToken);

    const sessionValue = `${SESSION_VERSION}:${sessionToken}.${signature}`;

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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