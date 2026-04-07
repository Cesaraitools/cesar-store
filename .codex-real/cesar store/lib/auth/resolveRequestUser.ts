import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAnonServerClient } from "@/lib/supabase/runtime";
import type { User } from "@supabase/supabase-js";

export async function resolveRequestUser(
  request: Request
): Promise<User | null> {
  try {
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabase = createAnonServerClient();

      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        return user;
      }
    }

    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user ?? null;
  } catch {
    return null;
  }
}
