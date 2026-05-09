import { NextResponse } from "next/server";
import { getRedis } from "@/lib/infra/redis";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { SESSION_COOKIE_NAME } from "@/lib/admin/constants";

async function loadAdminSessionKeys() {
  const redis = getRedis();
  const keys: string[] = [];
  let cursor: string | number = 0;

  do {
    const [nextCursor, batch] = await redis.scan(cursor, {
      match: "admin_session:*",
      count: 500,
    });

    keys.push(...batch);
    cursor = nextCursor;
  } while (cursor !== "0");

  return { redis, keys };
}

export async function POST() {
  try {
    if (!(await validateAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { redis, keys } = await loadAdminSessionKeys();

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis.del(key)));
    }

    const response = NextResponse.json({
      success: true,
      message: "All admin sessions invalidated",
      deletedSessions: keys.length,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to force logout" },
      { status: 500 }
    );
  }
}
