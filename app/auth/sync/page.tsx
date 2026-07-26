import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthSyncPageProps = {
  searchParams?: {
    redirect?: string | string[];
    error?: string | string[];
    exchange_error?: string | string[];
  };
};

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeRedirectPath(value?: string) {
  if (!value) return "/checkout";
  if (!value.startsWith("/") || value.startsWith("//")) return "/checkout";
  if (value.startsWith("/auth/sync")) return "/checkout";
  return value;
}

export default async function AuthSyncPage({
  searchParams,
}: AuthSyncPageProps) {
  const redirectTo = getSafeRedirectPath(
    getSingleParam(searchParams?.redirect)
  );
  const oauthError =
    getSingleParam(searchParams?.error) ||
    getSingleParam(searchParams?.exchange_error);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URLSearchParams({ redirect: redirectTo });

    if (oauthError) {
      loginUrl.set("oauth_error", "1");
    }

    redirect(`/auth/login?${loginUrl.toString()}`);
  }

  redirect(redirectTo);
}
