"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthSyncPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  useEffect(() => {
    const syncSession = async () => {
      const supabase = createClient();

      // 💣 المهم: نجبر قراءة السيشن
      await supabase.auth.getSession();

      // بعد ما السيشن تتأكد
      router.replace(redirect);
    };

    syncSession();
  }, [redirect, router]);

  return (
    <div className="p-10 text-center">
      جاري تسجيل الدخول...
    </div>
  );
}