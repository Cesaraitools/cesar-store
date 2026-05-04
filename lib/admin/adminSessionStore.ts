// =====================================================
// Admin Session System (Redis-based - Production Ready)
// Path: /lib/admin/adminSessionStore.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "@/lib/infra/redis";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION_KEY = "admin_session_version";
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
let currentVersion = await redis.get(SESSION_VERSION_KEY);

if (!currentVersion) {
  currentVersion = "v1";
  await redis.set(SESSION_VERSION_KEY, currentVersion);
}

  const key = `admin_session:${currentVersion}:${token}`;

  await redis.set(key, "1", {
    ex: SESSION_TTL_SECONDS,
  });
}

/**
 * 🔥 Check Session (Redis)
 */
export async function isSessionValid(token: string): Promise<boolean> {
  const redis = getRedis();

 
const currentVersion =
  (await redis.get(SESSION_VERSION_KEY)) || "v1";

const key = `admin_session:${currentVersion}:${token}`;
  const exists = await redis.get(key);

  return Boolean(exists);
}

/**
 * 🔥 Delete Session (Logout)
 */
export async function deleteSession(token: string) {
  const redis = getRedis();

 
const currentVersion =
  (await redis.get(SESSION_VERSION_KEY)) || "v1";
 
const key = `admin_session:${currentVersion}:${token}`;
  await redis.del(key);
}
