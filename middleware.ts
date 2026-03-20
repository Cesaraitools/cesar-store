import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ استثناء صفحة اللوجين (أي شكل)
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // ✅ استثناء API اللوجين بالكامل
  if (pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  // ✅ حماية كل admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    // ❌ مفيش session
    if (!sessionCookie) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // ❌ session version غلط
    const [version] = sessionCookie.value.split(":");

    if (version !== SESSION_VERSION) {
      const response = NextResponse.redirect(
        new URL("/admin/login", request.url)
      );

      // 🔥 امسح الكوكي عشان تمنع loops
      response.cookies.delete(SESSION_COOKIE_NAME);

      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};