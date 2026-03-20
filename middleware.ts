import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ أهم حاجة: استثناء صريح ونهائي
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/admin/login")
  ) {
    return NextResponse.next();
  }

  // ✅ حماية admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const loginUrl = new URL("/admin/login", request.url);

      // 🔥 مهم: منع loop
      if (pathname !== "/admin/login") {
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    }

    const [version] = sessionCookie.value.split(":");

    if (version !== SESSION_VERSION) {
      const response = NextResponse.redirect(
        new URL("/admin/login", request.url)
      );

      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};