import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

function verifyToken(token: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح للوجين
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // 🔥 أهم تعديل هنا
  const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

  if (!ADMIN_SESSION_SECRET) {
    console.error("❌ ADMIN_SESSION_SECRET missing in middleware");
    
    // بدل crash → نرجع login
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Server misconfig" }, { status: 500 });
    }

    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const [version, payload] = sessionCookie.value.split(":");

    if (version !== SESSION_VERSION || !payload) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const [token, signature] = payload.split(".");

    if (
      !token ||
      !signature ||
      !verifyToken(token, signature, ADMIN_SESSION_SECRET)
    ) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};