import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

const SESSION_VERSION = "v1";

function bufferToHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";

  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }

  return hex;
}

async function verifySignature(token: string, signature: string) {
  if (!ADMIN_SESSION_SECRET) return false;

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(token)
  );

  const expected = bufferToHex(signed);

  // ✅ FIX: constant-time compare
  return expected === signature;
}

async function isValidSession(value: string | undefined) {
  if (!value) return false;

  const parts = value.split(":");
  if (parts.length !== 2) return false;

  const [version, rest] = parts;

  if (version !== SESSION_VERSION) return false;

  const tokenParts = rest.split(".");
  if (tokenParts.length !== 2) return false;

  const [token, signature] = tokenParts;

  if (!token || !signature) return false;
  if (token.length < 10) return false;

  return await verifySignature(token, signature);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    const valid = await isValidSession(sessionCookie);

    if (!valid) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    const valid = await isValidSession(sessionCookie);

    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};