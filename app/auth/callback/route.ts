// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
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

  const getSafeRedirect = (value: string | null) => {
    if (!value) return "/";

    try {
      const url = new URL(value, requestUrl.origin);
      if (url.origin !== requestUrl.origin) return "/";
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "/";
    }
  };

  const redirectTo = getSafeRedirect(requestUrl.searchParams.get("redirect"));

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}