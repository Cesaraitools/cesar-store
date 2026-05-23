import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type AdminRole = "full" | "orders";

export type AdminAccess = {
  hasAdminSession: boolean;
  role: AdminRole | null;
  userEmail: string | null;
};

const DEFAULT_FULL_ADMIN_EMAIL = "mohamed.seeking@gmail.com";

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function parseEmailList(value?: string) {
  return new Set(
    String(value || "")
      .split(/[,\s;]+/)
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

function getFullAdminEmails() {
  const emails = parseEmailList(process.env.SUPER_ADMIN_EMAIL);
  emails.add(DEFAULT_FULL_ADMIN_EMAIL);
  return emails;
}

function getOrderAdminEmails() {
  return parseEmailList(process.env.ORDER_ADMIN_EMAILS);
}

export function canAccessAdminPath(pathname: string, role: AdminRole | null) {
  if (role === "full") {
    return true;
  }

  if (role === "orders") {
    return (
      pathname === "/admin/orders" ||
      (/^\/admin\/orders\/[^/]+$/.test(pathname) &&
        pathname !== "/admin/orders/archive")
    );
  }

  return false;
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const hasAdminSession = await validateAdminSession();

  if (!hasAdminSession) {
    return {
      hasAdminSession: false,
      role: null,
      userEmail: null,
    };
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = normalizeEmail(user?.email);

  if (!userEmail) {
    return {
      hasAdminSession: true,
      role: null,
      userEmail: null,
    };
  }

  if (getFullAdminEmails().has(userEmail)) {
    return {
      hasAdminSession: true,
      role: "full",
      userEmail,
    };
  }

  if (getOrderAdminEmails().has(userEmail)) {
    return {
      hasAdminSession: true,
      role: "orders",
      userEmail,
    };
  }

  return {
    hasAdminSession: true,
    role: null,
    userEmail,
  };
}

export async function requireAdminRole(allowedRoles: AdminRole[]) {
  const access = await getAdminAccess();

  if (!access.hasAdminSession) {
    return {
      access,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!access.role || !allowedRoles.includes(access.role)) {
    return {
      access,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    access,
    response: null,
  };
}
