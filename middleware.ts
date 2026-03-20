import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ مهم جدًا: السماح لأي request فيه login
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  // حماية باقي الادمن
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/admin-login", request.url));
    }

    const [version] = sessionCookie.value.split(":");

    if (version !== SESSION_VERSION) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};