import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // نوجه للـ sync page وهي اللي تقرأ sessionStorage وتكمل التوجيه
  return NextResponse.redirect(`${requestUrl.origin}/auth/sync`);
}