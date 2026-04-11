import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  try {
    const SESSION_VERSION = "v1";

    const currentVersion =
      (globalThis as any).ADMIN_SESSION_VERSION || SESSION_VERSION;

    const newVersion = `v${Date.now()}`;

    (globalThis as any).ADMIN_SESSION_VERSION = newVersion;

    console.log(
      `[ADMIN_AUTH] ${new Date().toISOString()} | FORCE_LOGOUT_ALL | oldVersion=${currentVersion} | newVersion=${newVersion}`
    );

    return NextResponse.json({
      success: true,
      message: "All admin sessions invalidated",
      oldVersion: currentVersion,
      newVersion,
    });
  } catch (error) {
    console.error("FORCE LOGOUT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to force logout all sessions" },
      { status: 500 }
    );
  }
}