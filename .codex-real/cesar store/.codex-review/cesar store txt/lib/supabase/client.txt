// /lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase Client
 * - Official SSR-compatible client for Next.js App Router
 * - Handles cookie-based sessions correctly
 * - Used in Client Components (AuthContext, Login, etc.)
 */

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}