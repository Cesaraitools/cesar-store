// /lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";
import { processLock } from "@supabase/auth-js";
import type { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";

/**
 * Browser Supabase Client
 * - Official SSR-compatible client for Next.js App Router
 * - Handles cookie-based sessions correctly
 * - Used in Client Components (AuthContext, Login, etc.)
 */

let browserClient: SupabaseClient | null = null;

const browserAuthOptions = {
  detectSessionInUrl: false,
  // Navigator LockManager can reject with SecurityError in restricted mobile browsers.
  // Supabase now recommends its process-scoped lock for browser auth coordination.
  lock: processLock,
  // Supported by auth-js at runtime; this package version does not expose it in supabase-js types.
  lockAcquireTimeout: 30000,
} as unknown as SupabaseClientOptions<"public">["auth"];

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  if (typeof window !== "undefined" && browserClient) {
    return browserClient;
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: browserAuthOptions,
  });

  if (typeof window !== "undefined") {
    browserClient = client;
  }

  return client;
}
