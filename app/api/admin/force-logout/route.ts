import { NextResponse } from "next/server";

export async function POST() {
  try {
    const SESSION_VERSION = "v1";

    // ✅ قراءة النسخة الحالية أو fallback
    const currentVersion =
      (globalThis as any).ADMIN_SESSION_VERSION || SESSION_VERSION;

    // ✅ إنشاء نسخة جديدة
    const newVersion = `v${Date.now()}`;

    // ✅ تحديث النسخة العالمية
    (globalThis as any).ADMIN_SESSION_VERSION = newVersion;

    console.log(
      `[ADMIN_AUTH] ${new Date().toISOString()} | FORCE_LOGOUT_ALL | oldVersion=${currentVersion} | newVersion=${newVersion}`
    );
       localStorage.setItem("admin_force_logout", Date.now().toString());
    return NextResponse.json({
      success: true,
      message: "All admin sessions invalidated",
      oldVersion: currentVersion,
      newVersion,
    });
    
  } catch {
    return NextResponse.json(
      { error: "Failed to force logout all sessions" },
      { status: 500 }
    );
  }
}