import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";

export async function requireAdminAccess() {
  const guard = await requireAdminRole(["full"]);

  if (guard.response) {
    return guard.response;
  }

  return null;
}
