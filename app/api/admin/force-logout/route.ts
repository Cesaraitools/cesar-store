import { NextResponse } from "next/server";
import { getRedis } from "@/lib/infra/redis";
export async function POST() {
  try {
    const redis = getRedis();

// 🔍 search all admin sessions
const keys: string[] = [];

let cursor = 0;

do {
  const result = await redis.scan(cursor, {
    match: "admin_session:*",
    count: 100,
  });

  cursor = Number(result[0]);
  keys.push(...result[1]);
} while (cursor !== 0);

// 🗑️ delete all sessions
if (keys.length > 0) {
  await redis.del(...keys);
}

    return NextResponse.json({
  success: true,
  message: "All admin sessions deleted from Redis",
});
  } catch (error) {
    console.error("FORCE LOGOUT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to force logout all sessions" },
      { status: 500 }
    );
  }
}