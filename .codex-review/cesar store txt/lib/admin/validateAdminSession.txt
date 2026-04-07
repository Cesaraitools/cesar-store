// =====================================================
// Admin Session Validator (Production-Grade)
// Cesar Store
// Path: /lib/admin/validateAdminSession.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET!;

/**
 * Verify HMAC signature
 */
function verifySignature(token: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
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

    return verifySignature(token, signature);
  } catch {
    return false;
  }
}