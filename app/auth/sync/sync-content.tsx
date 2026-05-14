"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect) return null;
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return null;
  if (redirect.startsWith("/auth/sync")) return null;
  return redirect;
}

export default function SyncContent() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectParam = params.get("redirect");
  const code = params.get("code");
  const oauthError = params.get("error");

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const storedRedirect =
        typeof window !== "undefined"
          ? sessionStorage.getItem("oauth_redirect") ||
            sessionStorage.getItem("last_redirect")
          : null;
      const redirect =
        getSafeRedirectPath(redirectParam) ||
        getSafeRedirectPath(storedRedirect) ||
        "/checkout";

      if (oauthError) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("OAuth session exchange failed:", error.message);
        }
      }

      let hasSession = false;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          hasSession = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!hasSession) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      await supabase.auth.getUser();

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("oauth_redirect");
        sessionStorage.removeItem("last_redirect");
      }

      router.replace(redirect);
    };

    run();
  }, [code, oauthError, redirectParam, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}
