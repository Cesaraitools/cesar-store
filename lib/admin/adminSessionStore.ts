import { redis } from "@/lib/redis";
const activeSessions = new Set<string>();

export function createSession(token: string) {
  activeSessions.add(token);
}

export function isSessionValid(token: string) {
  return activeSessions.has(token);
}

export function deleteSession(token: string) {
  activeSessions.delete(token);
}

export function clearAllSessions() {
  activeSessions.clear();
}

// 🔥 placeholder لمرحلة Redis (مش مستخدم حالياً)
export async function createSessionPersistent(token: string) {
  // حفظ في Redis لمدة 8 ساعات
  await redis.set(`admin_session:${token}`, "1", {
    ex: 60 * 60 * 8,
  });

  // fallback memory (اختياري حالياً)
  createSession(token);
}

export async function isSessionValidPersistent(token: string) {
  const exists = await redis.get(`admin_session:${token}`);

  if (exists) return true;

  // fallback مؤقت
  return isSessionValid(token);
}