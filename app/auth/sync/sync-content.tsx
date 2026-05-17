"use client";

import { useEffect, useRef } from "react";
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
  const oauthError = params.get("error");
  const authCode = params.get("code");
  const exchangeError = params.get("exchange_error");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

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
      const hasActiveSession = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        return Boolean(session?.user);
      };

      if (oauthError) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      if (authCode && !(await hasActiveSession())) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          if (!(await hasActiveSession())) {
            console.error(
              "OAuth client session exchange failed:",
              exchangeError || error.message
            );
            router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
            return;
          }
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
  }, [authCode, exchangeError, oauthError, redirectParam, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}
