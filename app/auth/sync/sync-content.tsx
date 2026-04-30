"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SyncContent() {
  const router = useRouter();
  const params = useSearchParams();
  let redirect = params.get("redirect");

  if (!redirect && typeof window !== "undefined") {
    redirect =
      sessionStorage.getItem("oauth_redirect") ||
      sessionStorage.getItem("last_redirect") ||
      "/checkout";
  }

  if (!redirect) {
    redirect = "/checkout";
  }

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      // 💣 إجبار قراءة السيشن
      await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

if (user?.email) {

}

      router.replace(redirect);
    };

    run();
  }, [redirect, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}