// /lib/rateLimit.ts

import { getRedis } from "@/lib/infra/redis";

/**
 * 🔥 Redis-based Rate Limiting (Sliding Window Approximation)
 * Production-safe for serverless environments
 */

export async function rateLimit(
  key: string,
  limit = 5,
  windowMs = 10000
) {
  try {
    const redis = getRedis();

    const now = Date.now();
    const windowKey = `rate_limit:${key}`;

    // 🔹 Increment counter
    const count = await redis.incr(windowKey);

    // 🔹 Set expiration only on first request
    if (count === 1) {
      await redis.pexpire(windowKey, windowMs);
    }

    // 🔹 Check limit
    if (count > limit) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Rate limit error:", error);

    // ❗ Fail-open (don't block user if Redis fails)
    return true;
  }
}