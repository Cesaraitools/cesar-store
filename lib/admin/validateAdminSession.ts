// =====================================================
// Admin Session Validator (Production-Grade - Redis + Version)
// Cesar Store
// Path: /lib/admin/validateAdminSession.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "@/lib/infra/redis";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION_KEY = "admin_session_version";
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
 * Main validator (Signature + Redis + Version)
 */
export async function validateAdminSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return false;

    // Expected: version:token.signature
    const [version, payload] = session.split(":");

    if (!payload) return false;

    const redis = getRedis();
    const currentVersion =
      (await redis.get(SESSION_VERSION_KEY)) || "v1";

    // 🔥 Version check
    if (version !== currentVersion) return false;

    const [token, signature] = payload.split(".");

    if (!token || !signature) return false;

    // 🔐 Signature check
    const isValidSignature = verifySignature(token, signature);
    if (!isValidSignature) return false;

    // 🔥 Redis session check
    const key = `admin_session:${currentVersion}:${token}`;
    const exists = await redis.get(key);

    return Boolean(exists);
  } catch {
    return false;
  }
}