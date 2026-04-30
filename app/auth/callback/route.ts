// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth Callback Handler
 *
 * Handles the redirect from Supabase OAuth providers (Google).
 * Exchanges the auth code for a session cookie and redirects
 * the user back to the application.
 */

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

 // نحاول نجيب redirect من query
let redirectTo = requestUrl.searchParams.get("redirect");

// 💣 FIX: fallback أقوى
if (!redirectTo) {
  // حاول من referer (مهم جدًا)
  const referer = request.headers.get("referer");

  if (referer && referer.includes("redirect=")) {
    const url = new URL(referer);
    redirectTo = url.searchParams.get("redirect");
  }
}

// fallback نهائي
if (!redirectTo) {
  redirectTo = "/checkout"; // مش "/" علشان ده السيناريو الأساسي
}

// 💣 FIX: إجبار المسار يكون absolute بشكل صحيح
const finalUrl = redirectTo.startsWith("http")
  ? redirectTo
  : `${requestUrl.origin}${redirectTo}`;

return NextResponse.redirect(
  `${requestUrl.origin}/auth/sync?redirect=${encodeURIComponent(finalUrl)}`
);
}