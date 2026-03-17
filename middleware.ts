import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

async function verifySignature(token: string, signature: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) return false;

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(token)
  );

  const expectedSignature = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signature;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ===============================
     Allow Public Admin Routes
  =============================== */

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  /* ===============================
     Protect Admin Pages + APIs
  =============================== */

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!cookie) {
      return redirectToLogin(request);
    }

    try {
      const [version, rest] = cookie.value.split(":");

      if (version !== SESSION_VERSION) {
        return redirectToLogin(request);
      }

      const [token, signature] = rest.split(".");

      if (!token || !signature) {
        return redirectToLogin(request);
      }

      const isValid = await verifySignature(token, signature);

      if (!isValid) {
        return redirectToLogin(request);
      }

      return NextResponse.next();
    } catch {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

/* ===============================
   Helpers
=============================== */

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";

  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};