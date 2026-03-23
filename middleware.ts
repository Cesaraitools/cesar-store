// =====================================================
// Secure Middleware (Production-Grade)
// Cesar Store
// Path: /middleware.ts
// =====================================================

import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

/* =========================
   Verify HMAC (Web Crypto)
========================= */

async function verifySignature(token: string, signature: string) {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET!;
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(token)
    );

    const expected = Buffer.from(signed).toString("hex");

    return expected === signature;
  } catch {
    return false;
  }
}

/* =========================
   Middleware
========================= */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Allow login routes
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  // 🔒 Protect admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/admin-login", request.url));
    }

    const raw = decodeURIComponent(sessionCookie.value);

    // Expected: v1:token.signature
    const [version, payload] = raw.split(":");

    if (version !== SESSION_VERSION || !payload) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }

    const [token, signature] = payload.split(".");

    if (!token || !signature) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }

    const isValid = await verifySignature(token, signature);

    if (!isValid) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};