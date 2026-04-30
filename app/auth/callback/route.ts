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
  // نحاول نجيب redirect من query (ده الأساس)
let redirectTo = requestUrl.searchParams.get("redirect");

// 💣 fallback ذكي من sessionStorage (عن طريق auth/sync مش هنا)
if (!redirectTo) {
  redirectTo = "/checkout";
}

// إجبار المسار يكون absolute
const finalUrl = redirectTo.startsWith("http")
  ? redirectTo
  : `${requestUrl.origin}${redirectTo}`;

// redirect مباشر
return NextResponse.redirect(finalUrl);