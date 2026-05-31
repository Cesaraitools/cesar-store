// /lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase Client
 * - Official SSR-compatible client for Next.js App Router
 * - Handles cookie-based sessions correctly
 * - Used in Client Components (AuthContext, Login, etc.)
 */

let browserClient: SupabaseClient | null = null;

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
    auth: {
      detectSessionInUrl: false,
    },
  });

  if (typeof window !== "undefined") {
    browserClient = client;
  }

  return client;
}
