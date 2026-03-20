import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET!;

function verifyToken(token: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(token)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح لصفحة login
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // السماح ل API login
  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }

    const [version, payload] = sessionCookie.value.split(":");
    if (version !== SESSION_VERSION || !payload) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const [token, signature] = payload.split(".");
    if (!token || !signature || !verifyToken(token, signature)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};