import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح بصفحة تسجيل الدخول و API تسجيل الدخول
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // التحقق من الجلسة للمسارات المحمية
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    try {
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, sessionOptions);

      if (!session.isAdmin) {
        // إذا كانت الجلسة غير صالحة، أعد التوجيه لتسجيل الدخول
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        } else {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = "/admin/login";
          return NextResponse.redirect(loginUrl);
        }
      }

      return response;
    } catch (error) {
      // في حالة وجود خطأ في الجلسة، أعد التوجيه لتسجيل الدخول
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      } else {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};