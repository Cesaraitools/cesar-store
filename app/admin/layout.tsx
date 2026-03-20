import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminClientLayout from "./AdminClientLayout";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  // ❌ مفيش session → رجوع login
  if (!session) {
    redirect("/admin/login");
  }

  const [version] = session.value.split(":");

  // ❌ session غير صالحة
  if (version !== SESSION_VERSION) {
    redirect("/admin/login");
  }

  // ✅ UI بدون تغيير
  return <AdminClientLayout>{children}</AdminClientLayout>;
}