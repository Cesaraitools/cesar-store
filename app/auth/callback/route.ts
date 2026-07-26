import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/auth/")) return "/";
  return value;
}

function getLoginErrorUrl(origin: string, redirectTo: string) {
  const loginUrl = new URL("/auth/login", origin);
  loginUrl.searchParams.set("redirect", redirectTo);
  loginUrl.searchParams.set("oauth_error", "1");
  return loginUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectTo = getSafeRedirectPath(
    requestUrl.searchParams.get("redirect")
  );
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");

  if (!code || providerError) {
    return NextResponse.redirect(
      getLoginErrorUrl(requestUrl.origin, redirectTo)
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      getLoginErrorUrl(requestUrl.origin, redirectTo)
    );
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
