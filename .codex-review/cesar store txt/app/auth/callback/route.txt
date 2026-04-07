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

  // If there is a redirect param we use it, otherwise go home
  const redirectTo = requestUrl.searchParams.get("redirect") ?? "/";

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}