import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

const SESSION_VERSION = "v1";

function verifySignature(token: string, signature: string) {
  if (!ADMIN_SESSION_SECRET) return false;

  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(token)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
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

  // Allow login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!isValidSession(sessionCookie)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow login API
  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // Protect admin APIs
  if (pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!isValidSession(sessionCookie)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};