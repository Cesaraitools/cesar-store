import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminClientLayout from "./AdminClientLayout";
import { headers } from "next/headers";
import { canAccessAdminPath, getAdminAccess } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = headers().get("x-admin-pathname") || "/admin";
  const access = await getAdminAccess();

  if (!access.hasAdminSession) {
    redirect("/admin-login");
  }

  if (!access.userEmail) {
    redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }

  if (!access.role) {
    redirect("/");
  }

  if (!canAccessAdminPath(pathname, access.role)) {
    redirect("/admin/orders");
  }

  return (
    <AdminClientLayout role={access.role} userEmail={access.userEmail}>
      {children}
    </AdminClientLayout>
  );
}
