import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 🧠 نحاول نجيب redirect من query
  let redirectTo = requestUrl.searchParams.get("redirect");

  // ❗ fallback (لو Google ضيّع الـ redirect)
  if (!redirectTo) {
    redirectTo = "/auth/sync";
  }

  const finalUrl = redirectTo.startsWith("http")
    ? redirectTo
    : `${requestUrl.origin}${redirectTo}`;

  return NextResponse.redirect(finalUrl);
}