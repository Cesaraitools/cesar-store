import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect) return "/checkout";
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/checkout";
  if (redirect.startsWith("/auth/sync")) return "/checkout";
  return redirect;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectTo = getSafeRedirectPath(requestUrl.searchParams.get("redirect"));
  const finalUrl = new URL("/auth/sync", requestUrl.origin);
  finalUrl.searchParams.set("redirect", redirectTo);

  return NextResponse.redirect(finalUrl);
}
