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
      const { data: { user } } = await supabase.auth.getUser();

if (user?.email) {

  const { data: existingUsers } = await supabase.auth.admin.listUsers();

  const match = existingUsers?.users?.find(
    (u: any) =>
      u.email?.toLowerCase() === user.email?.toLowerCase()
  );

  // لو فيه حساب بنفس الإيميل ومش نفس الـ id
  if (match && match.id !== user.id) {
    console.log("⚠️ Duplicate account detected - needs linking");
  }
}

      router.replace(redirect);
    };

    run();
  }, [redirect, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}