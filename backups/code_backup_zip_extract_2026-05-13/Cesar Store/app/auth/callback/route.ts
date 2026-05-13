import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 🧠 نحاول نجيب redirect
  let redirectTo = requestUrl.searchParams.get("redirect");

  // 💣 أهم سطر في الحل كله
  if (!redirectTo) {
    redirectTo = "/auth/sync";
  }

  const finalUrl = redirectTo.startsWith("http")
    ? redirectTo
    : `${requestUrl.origin}${redirectTo}`;

  return NextResponse.redirect(finalUrl);
}