// =====================================================
// Admin Session Validator (Redis-based - Production Ready)
// Path: /lib/admin/validateAdminSession.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "@/lib/infra/redis";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET!;

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

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
 * Check Redis session
 */
async function isSessionValid(token: string): Promise<boolean> {
  const redis = getRedis();
  const key = `admin_session:${token}`;
  const exists = await redis.get(key);
  return Boolean(exists);
}

/**
 * Main validator
 */
export async function validateAdminSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return false;

    const [version, payload] = session.split(":");
    if (version !== SESSION_VERSION || !payload) return false;

    const [token, signature] = payload.split(".");
    if (!token || !signature) return false;

    // 1. verify signature
    const isValidSignature = verifySignature(token, signature);
    if (!isValidSignature) return false;

    // 2. check Redis session
    const exists = await isSessionValid(token);
    if (exists) await getRedis().expire(`admin_session:${token}`, SESSION_TTL_SECONDS);
    return exists;
  } catch {
    return false;
  }
}