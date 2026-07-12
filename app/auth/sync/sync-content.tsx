"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createSafeUUID } from "@/lib/safe-uuid";
import { createClient } from "@/lib/supabase/client";

const CART_STORAGE_KEY = "cesar_store_cart_v2";
const OAUTH_GUEST_CART_STORAGE_KEY = "cesar_store_oauth_guest_cart";
const OAUTH_MERGE_COMPLETE_USER_KEY = "cesar_store_oauth_merge_complete_user";

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect) return null;
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return null;
  if (redirect.startsWith("/auth/sync")) return null;
  return redirect;
}

function normalizeVariantKey(value?: unknown) {
  return typeof value === "string" ? value : "";
}

function mapCartItemsForStorage(dbItems: any[]) {
  return dbItems.map((item: any) => ({
    id: item.id,
    cart_id: item.cart_id,
    product_id: item.product_id,
    name_ar: item.name_ar || item.name || "",
    name_en: item.name_en || item.name || "",
    name: item.name || item.name_en || item.name_ar || "Product",
    price: Number(item.price || 0),
    image: item.image || null,
    variant_key: normalizeVariantKey(item.variant_key),
    variant: item.variant_snapshot || item.variant || null,
    quantity: item.quantity,
    stock: typeof item.stock === "number" ? item.stock : 0,
    created_at: item.created_at,
  }));
}

async function syncOauthGuestCart(session: Session) {
  if (typeof window === "undefined") return;

  const rawBackup = sessionStorage.getItem(OAUTH_GUEST_CART_STORAGE_KEY);
  if (!rawBackup) return;

  let backup: any = null;

  try {
    backup = JSON.parse(rawBackup);
  } catch {
    return;
  }

  const backupItems = Array.isArray(backup?.items) ? backup.items : [];
  if (backupItems.length === 0) return;

  const items = backupItems.map((item: any) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    variant_key: normalizeVariantKey(item.variant_key),
    variant: item.variant ?? null,
  }));

  const mergeRes = await fetch("/api/cart/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ items }),
  });

  if (!mergeRes.ok) {
    throw new Error("OAuth guest cart merge failed");
  }

  const itemsRes = await fetch("/api/cart/items", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!itemsRes.ok) {
    throw new Error("OAuth cart refresh failed");
  }

  const itemsData = await itemsRes.json();
  const dbItems = Array.isArray(itemsData?.items) ? itemsData.items : [];

  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      id:
        typeof backup?.id === "string" && backup.id
          ? backup.id
          : createSafeUUID(),
      ownerUserId: session.user.id,
      items: mapCartItemsForStorage(dbItems),
    })
  );
  sessionStorage.removeItem(OAUTH_GUEST_CART_STORAGE_KEY);
  sessionStorage.setItem(OAUTH_MERGE_COMPLETE_USER_KEY, session.user.id);
}

export default function SyncContent() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectParam = params.get("redirect");
  const oauthError = params.get("error");
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

      if (exchangeError && !(await hasActiveSession())) {
        console.error("OAuth server session exchange failed:", exchangeError);
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      let activeSession: Session | null = null;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          activeSession = session;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!activeSession) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      await supabase.auth.getUser();

      try {
        await syncOauthGuestCart(activeSession);
      } catch (error) {
        console.warn("OAuth cart sync failed before redirect", error);
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("oauth_redirect");
        sessionStorage.removeItem("last_redirect");
      }

      router.replace(redirect);
    };

    run();
  }, [exchangeError, oauthError, redirectParam, router]);

  return <div className="p-10 text-center">جاري تسجيل الدخول...</div>;
}
