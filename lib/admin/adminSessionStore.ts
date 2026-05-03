// =====================================================
// Admin Session System (Redis-based - Production Ready)
// Path: /lib/admin/adminSessionStore.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "@/lib/infra/redis";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET!;

// ⏱️ Session TTL (مثلاً 7 أيام)
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * 🔐 Verify HMAC signature
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
 * 🔥 Create Session (Redis)
 */
export async function createSession(token: string) {
  const redis = getRedis();

  const key = `admin_session:${token}`;

  await redis.set(key, "1", {
    ex: SESSION_TTL_SECONDS,
  });
}

/**
 * 🔥 Check Session (Redis)
 */
export async function isSessionValid(token: string): Promise<boolean> {
  const redis = getRedis();

  const key = `admin_session:${token}`;
  const exists = await redis.get(key);

  return Boolean(exists);
}

/**
 * 🔥 Delete Session (Logout)
 */
export async function deleteSession(token: string) {
  const redis = getRedis();

  const key = `admin_session:${token}`;
  await redis.del(key);
}

/**
 * 🔥 Clear All Sessions (optional)
 */
export async function clearAllSessions() {
  // ❗ ممكن نعمل scan + delete لو احتجنا
  // مش ضروري دلوقتي
}

/**
 * 🔥 Main Validator (Signature + Redis)
 */
export async function validateAdminSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return false;

    // Expected: v1:token.signature
    const [version, payload] = session.split(":");

    if (version !== SESSION_VERSION || !payload) return false;

    const [token, signature] = payload.split(".");

    if (!token || !signature) return false;

    // 🔐 Step 1: Verify signature
    const isValidSignature = verifySignature(token, signature);
    if (!isValidSignature) return false;

    // 🔥 Step 2: Check Redis session
    const exists = await isSessionValid(token);

    return exists;
  } catch {
    return false;
  }
}