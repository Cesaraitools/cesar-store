// =====================================================
// Admin Session Validator (Production-Grade)
// Cesar Store
// Path: /lib/admin/validateAdminSession.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { isSessionValid } from "@/lib/admin/adminSessionStore";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

/**
 * Verify HMAC signature
 */
function verifySignature(token: string, signature: string): boolean {
  const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminSessionSecret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", adminSessionSecret)
    .update(token)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Main validator
 */
export function validateAdminSession(): boolean {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return false;

    // Expected: v1:token.signature
    const [version, payload] = session.split(":");

    if (version !== SESSION_VERSION || !payload) return false;

    const [token, signature] = payload.split(".");

    if (!token || !signature) return false;
    if (!isSessionValid(token)) return false;

    return verifySignature(token, signature);
  } catch {
    return false;
  }
}
