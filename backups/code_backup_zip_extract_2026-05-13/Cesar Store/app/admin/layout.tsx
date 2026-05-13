import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminClientLayout from "./AdminClientLayout";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Keep page protection aligned with the same Redis-backed contract used by admin APIs.
  const isValidSession = await validateAdminSession();

  if (!isValidSession) {
    redirect("/admin-login");
  }

  return <AdminClientLayout>{children}</AdminClientLayout>;
}
