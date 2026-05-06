// =====================================================
// Admin Session Validator (Production-Grade)
// Cesar Store
// Path: /lib/admin/validateAdminSession.ts
// =====================================================

import { cookies } from "next/headers";
import { isSessionValidPersistent } from "@/lib/admin/adminSessionStore";
import { SESSION_COOKIE_NAME } from "@/lib/admin/constants";
import {
  parseAdminSessionCookie,
  verifyAdminSessionSignature,
} from "@/lib/admin/session-core";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

if (!ADMIN_SESSION_SECRET) {
  throw new Error("ADMIN_SESSION_SECRET is not set");
}

/**
 * Main validator
 */
export async function validateAdminSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return false;

    // Expected: v1:token.signature
   const parsed = parseAdminSessionCookie(session);

if (!parsed) return false;

const { token, signature } = parsed;

   return (
  verifyAdminSessionSignature(token, signature) &&
  (await isSessionValidPersistent(token))
);

  } catch {
    return false;
  }
}