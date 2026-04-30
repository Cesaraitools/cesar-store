import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // تبادل الكود للحصول على session
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // نجيب redirect من query
  let redirectTo = requestUrl.searchParams.get("redirect");

  // fallback لو مش موجود
  if (!redirectTo) {
    redirectTo = "/checkout";
  }

  // نحول لـ absolute URL
  const finalUrl = redirectTo.startsWith("http")
    ? redirectTo
    : `${requestUrl.origin}${redirectTo}`;

  // redirect مباشر
  return NextResponse.redirect(finalUrl);
}