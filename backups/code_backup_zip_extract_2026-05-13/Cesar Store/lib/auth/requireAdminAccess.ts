import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export async function requireAdminAccess() {
  const isValid = await validateAdminSession();

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}