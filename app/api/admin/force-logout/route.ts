import { NextResponse } from "next/server";
import { getRedis } from "@/lib/infra/redis";

export async function POST() {
  try {
    const redis = getRedis();

    await redis.set("admin_session_version", `v${Date.now()}`);

    return NextResponse.json({
      success: true,
      message: "All admin sessions invalidated",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to force logout" },
      { status: 500 }
    );
  }
}