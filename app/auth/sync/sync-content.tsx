"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SyncContent() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      // 💣 إجبار قراءة السيشن
      await supabase.auth.getSession();

      router.replace(redirect);
    };

    run();
  }, [redirect, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}