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

      await supabase.auth.getSession();
      await supabase.auth.getUser();

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("oauth_redirect");
        sessionStorage.removeItem("last_redirect");
      }

      router.replace(redirect);
    };

    run();
  }, [redirectParam, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}
