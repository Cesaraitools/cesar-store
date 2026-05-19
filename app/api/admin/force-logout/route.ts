import { NextResponse } from "next/server";
import { getRedis } from "@/lib/infra/redis";
import { requireAdminRole } from "@/lib/admin/permissions";

export async function POST() {
  try {
    const guard = await requireAdminRole(["full"]);
    if (guard.response) return guard.response;

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
