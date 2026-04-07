"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/auth/login?redirect=${redirect}`);
    }
  }, [user, loading, pathname, router]);
}