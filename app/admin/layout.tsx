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

  // ❌ لا يوجد كوكي
  if (!session || !session.value) {
    redirect("/admin/login");
  }

  const parts = session.value.split(":");

  // ❌ كوكي تالفة
  if (parts.length < 2) {
    redirect("/admin/login");
  }

  const [version, payload] = parts;

  // ❌ version غلط
  if (version !== SESSION_VERSION) {
    redirect("/admin/login");
  }

  // ❌ payload فاضي
  if (!payload || payload.length < 10) {
    redirect("/admin/login");
  }

  // ✅ سليم → يدخل
  return <AdminClientLayout>{children}</AdminClientLayout>;
}