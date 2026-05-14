import { NextResponse } from "next/server";

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect) return "/checkout";
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/checkout";
  if (redirect.startsWith("/auth/sync")) return "/checkout";
  return redirect;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const redirectTo = getSafeRedirectPath(requestUrl.searchParams.get("redirect"));
  const finalUrl = new URL("/auth/sync", requestUrl.origin);
  finalUrl.searchParams.set("redirect", redirectTo);

  if (code) {
    finalUrl.searchParams.set("code", code);
  }

  if (error) {
    finalUrl.searchParams.set("error", error);
  }

  if (errorDescription) {
    finalUrl.searchParams.set("error_description", errorDescription);
  }

  return NextResponse.redirect(finalUrl);
}
