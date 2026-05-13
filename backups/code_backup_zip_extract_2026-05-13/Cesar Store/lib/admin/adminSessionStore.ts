import { redis } from "../redis";

// 🔥 placeholder لمرحلة Redis (مش مستخدم حالياً)
export async function createSessionPersistent(token: string) {
  // حفظ في Redis لمدة 8 ساعات
  await redis.set(`admin_session:${token}`, "1", {
    ex: 60 * 60 * 8,
  });

}

export async function isSessionValidPersistent(token: string) {
  const exists = await redis.get(`admin_session:${token}`);

 return !!exists;
}