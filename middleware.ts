import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1"; // ← Version المسموح بها حاليًا

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ===============================
     Admin Pages
  =============================== */

  // السماح بصفحة تسجيل الدخول
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }

    const [version] = sessionCookie.value.split(":");

    if (version !== SESSION_VERSION) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  /* ===============================
     Admin APIs
  =============================== */

  // السماح بتسجيل الدخول بدون Session
  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [version] = sessionCookie.value.split(":");

    if (version !== SESSION_VERSION) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};