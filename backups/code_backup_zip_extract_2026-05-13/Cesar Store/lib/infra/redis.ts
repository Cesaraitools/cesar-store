// /lib/infra/redis.ts

import { Redis } from "@upstash/redis";

/**
 * 🔥 Global Redis Singleton
 * - Serverless safe
 * - Reused across all requests
 */

let redis: Redis | null = null;

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error("UPSTASH_REDIS_REST_URL is missing");
  }

  if (!token) {
    throw new Error("UPSTASH_REDIS_REST_TOKEN is missing");
  }

  return new Redis({
    url,
    token,
  });
}

export const getRedis = (): Redis => {
  if (!redis) {
    redis = createRedisClient();
  }

  return redis;
}