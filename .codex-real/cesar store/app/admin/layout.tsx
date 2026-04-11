import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminClientLayout from "./AdminClientLayout";
import crypto from "crypto"; // ✅ إضافة فقط

import { validateAdminSession } from "@/lib/admin/validateAdminSession";

const SESSION_COOKIE_NAME = "cesar_admin_session";
const SESSION_VERSION = "v1";

// ✅ إضافة فقط

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  // ❌ لا يوجد كوكي
  if (!session || !session.value) {
    redirect("/admin-login");
  }

  const parts = session.value.split(":");

  // ❌ كوكي تالفة
  if (parts.length < 2) {
    redirect("/admin-login");
  }

  const [version, payload] = parts;

  // ❌ version غلط
  const CURRENT_VERSION =
    (globalThis as any).ADMIN_SESSION_VERSION || SESSION_VERSION;

  if (version !== CURRENT_VERSION) {
    redirect("/admin-login");
  }

  // ❌ payload فاضي
  if (!payload || payload.length < 10) {
    redirect("/admin-login");
  }

  // =========================
  // ✅ ADDITIONAL SECURITY LAYER (NO LOGIC REMOVED)
  // =========================

  // Validate signature using external validator
  if (!validateAdminSession()) {
    redirect("/admin-login");
  }

  // =========================
  // ❌ TEMP DISABLED SESSION STORE (CAUSE OF LOOP)
  // =========================
  /*
  try {
    const session = cookies().get("cesar_admin_session")?.value;
    const payload = session?.split(":")[1];
    const token = payload?.split(".")[0];

    if (!token || !isSessionValid(token)) {
      redirect("/admin-login");
    }
  } catch {
    redirect("/admin-login");
  }
  */
  // =========================

  // =========================
  // ✅ Security Layer (إضافة فقط)
  // =========================
  try {
    const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!adminSessionSecret) {
      redirect("/admin-login");
    }

    const [token, signature] = payload.split(".");

    if (!token || !signature) {
      redirect("/admin-login");
    }

    const expectedSignature = crypto
      .createHmac("sha256", adminSessionSecret)
      .update(token)
      .digest("hex");

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValidSignature) {
      redirect("/admin-login");
    }
  } catch {
    redirect("/admin-login");
  }
  // =========================

  console.log("ADMIN LAYOUT RUNNING");

  // ✅ سليم → يدخل
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
