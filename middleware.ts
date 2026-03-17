import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

const SESSION_VERSION = "v1";

function verifySignature(token: string, signature: string) {
  if (!ADMIN_SESSION_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(token)
    .digest("hex");

  return expected === signature;
}

function isValidSession(value: string | undefined) {
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

  return verifySignature(token, signature);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // login page always allowed
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    const valid = isValidSession(sessionCookie);

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

    const valid = isValidSession(sessionCookie);

    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};