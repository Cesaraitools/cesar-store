// =====================================================
// Admin Session Validator (Production-Grade)
// Cesar Store
// Path: /lib/admin/validateAdminSession.ts
// =====================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "@/lib/infra/redis";

const SESSION_COOKIE_NAME = "cesar_admin_session";


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
export async function validateAdminSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return false;

    // Expected: v1:token.signature
    const [version, payload] = session.split(":");
    const redis = getRedis();
let currentVersion = await redis.get("admin_session_version");

if (!currentVersion) {
  currentVersion = version; // fallback ذكي من الكوكي
}

// نخليها flexible شوية
if (currentVersion && version !== currentVersion) return false;

    if (!payload) return false;

    const [token, signature] = payload.split(".");

    if (!token || !signature) return false;

    // Verify signature
const isValidSignature = verifySignature(token, signature);
if (!isValidSignature) return false;

// Check Redis session (IMPORTANT)
const key = `admin_session:${version}:${token}`;
const exists = await redis.get(key);

if (!exists) return false;

return true;
  } catch {
    return false;
  }
}