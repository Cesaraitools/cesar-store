import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export function requireAdminAccess() {
  if (!validateAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
