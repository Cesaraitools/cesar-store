import { NextResponse } from "next/server";

export async function POST() {
  try {
    const newVersion = `v${Date.now()}`;

    globalThis.ADMIN_SESSION_VERSION = newVersion;

    console.log(
      `[ADMIN_AUTH] ${new Date().toISOString()} | FORCE_LOGOUT_ALL | newVersion=${newVersion}`
    );

    return NextResponse.json({
      success: true,
      message: "All admin sessions invalidated",
      newVersion,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to force logout all sessions" },
      { status: 500 }
    );
  }
}