"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Archive,
  Tag,
  Package,
  BarChart3,
  LineChart,
  SearchCheck,
  MessageSquareWarning,
  TicketPercent,
  LogOut,
  UserCircle,
  Store,
  Users,
  RotateCcw,
  FileText,
  Settings,
  Send,
  Wrench,
  ShieldAlert, // ✅ أضف ده
} from "lucide-react";
import type { AdminRole } from "@/lib/admin/permissions";
import {
  ADMIN_ERROR_COUNT_EVENT,
  DISMISSED_ERRORS_STORAGE_KEY,
  countVisibleAdminErrors,
  parseDismissedAdminErrorIds,
} from "@/lib/admin/error-notifications";

export const dynamic = "force-dynamic";

export default function AdminClientLayout({
  children,
  role,
  userEmail,
}: {
  children: ReactNode;
  role: AdminRole;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [errorCount, setErrorCount] = useState<number | null>(null);

  useEffect(() => {
    if (role !== "full") return;

    let isMounted = true;

    const loadErrorCount = async () => {
      try {
        const response = await fetch("/api/admin/errors", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          errors?: Array<{ id: string }>;
        };
        if (!isMounted || !Array.isArray(payload.errors)) return;

        const dismissedIds = parseDismissedAdminErrorIds(
          window.localStorage.getItem(DISMISSED_ERRORS_STORAGE_KEY)
        );
        setErrorCount(countVisibleAdminErrors(payload.errors, dismissedIds));
      } catch {
        // Keep the last known count if Sentry is temporarily unavailable.
      }
    };

    const handleCountUpdate = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (Number.isInteger(count) && count >= 0) setErrorCount(count);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadErrorCount();
    };

    void loadErrorCount();
    const interval = window.setInterval(loadErrorCount, 30_000);
    window.addEventListener(ADMIN_ERROR_COUNT_EVENT, handleCountUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener(ADMIN_ERROR_COUNT_EVENT, handleCountUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [role]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });

      // ✅ مهم جدًا: hard redirect
      window.location.href = "/admin-login";

    } catch (error) {
      console.error("Logout failed", error);
    }
  }
  
  const dashboardItem = { name: "Dashboard", href: "/admin", icon: LayoutDashboard };
  const retailNavItems = [
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Charts", href: "/admin/charts", icon: LineChart },
    { name: "SEO Audit", href: "/admin/seo", icon: SearchCheck },
    { name: "Errors", href: "/admin/errors", icon: ShieldAlert },
    { name: "Meta Replies", href: "/admin/meta-handoffs", icon: MessageSquareWarning },
    { name: "Social Publisher", href: "/admin/social-publisher", icon: Send },
    { name: "Maintenance Mode", href: "/admin/maintenance-mode", icon: Wrench },
    { name: "Categories", href: "/admin/categories", icon: Tag },
    { name: "Orders", href: "/admin/orders", icon: Package },
    { name: "Archive", href: "/admin/orders/archive", icon: Package },
    { name: "Customer informations", href: "/admin/delivered-customers", icon: Users },
    { name: "Products", href: "/admin/products", icon: Package },
  ];
  const wholesaleNavItems = [
    { name: "Wholesale Overview", href: "/admin/wholesale/overview", icon: LayoutDashboard },
    { name: "Applications", href: "/admin/wholesale", icon: Store },
    { name: "Wholesale Customers", href: "/admin/wholesale/customers", icon: Users },
    { name: "Wholesale Orders", href: "/admin/wholesale/orders", icon: Package },
    { name: "Wholesale Archive", href: "/admin/wholesale/orders/archive", icon: Archive },
    { name: "Wholesale Returns", href: "/admin/wholesale/returns", icon: RotateCcw },
    { name: "Products & Pricing", href: "/admin/wholesale/products", icon: Store },
    { name: "Wholesale Analytics", href: "/admin/wholesale/analytics", icon: BarChart3 },
    { name: "Wholesale Charts", href: "/admin/wholesale/charts", icon: LineChart },
    { name: "Reports & Exports", href: "/admin/wholesale/reports", icon: FileText },
    { name: "Wholesale Settings", href: "/admin/wholesale/settings", icon: Settings },
  ];
  const promoNavItems = [
    { name: "إدارة الإعلانات والعروض", href: "/admin/promos", icon: TicketPercent },
  ];
  const activeAdminSection = pathname?.startsWith("/admin/wholesale")
    ? "wholesale"
    : pathname?.startsWith("/admin/promos")
    ? "promos"
    : pathname && pathname !== "/admin"
    ? "retail"
    : "dashboard";
  const sectionNavItems =
    activeAdminSection === "wholesale"
      ? wholesaleNavItems
      : activeAdminSection === "promos"
      ? promoNavItems
      : activeAdminSection === "retail"
      ? retailNavItems
      : [];
  const navItems = [dashboardItem, ...sectionNavItems].filter((item) => {
    if (role === "full") {
      return true;
    }

    return item.href === "/admin/orders";
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="admin-sidebar w-72 bg-white border-l border-gray-200 flex flex-col shadow-sm">
        <div className="p-8">
          <h2 className="text-2xl font-black text-blue-600 tracking-tighter">
            CESAR <span className="text-gray-900">ADMIN</span>
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-label={
                  item.href === "/admin/errors" && errorCount !== null
                    ? `${item.name}: ${errorCount} إشعارات أخطاء`
                    : item.name
                }
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "text-white" : "group-hover:text-blue-600"
                  }`}
                />
                <span className="font-bold text-sm">{item.name}</span>
                {item.href === "/admin/errors" && errorCount !== null ? (
                  <span
                    className={`absolute -top-2 left-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1.5 text-[10px] font-black tabular-nums text-white shadow-md ${
                      errorCount > 0 ? "bg-rose-600" : "bg-emerald-500"
                    }`}
                    title={`${errorCount} إشعارات أخطاء ظاهرة`}
                    aria-hidden="true"
                  >
                    {errorCount > 99 ? "99+" : errorCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 italic text-[10px] text-gray-400 px-8">
          v1.0.0 Stable Architecture
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="admin-topbar h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-gray-400">
            <UserCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">
              {role === "full" ? "مدير النظام" : "متابعة الطلبات"}
            </span>
            <span className="text-xs font-bold text-gray-400" dir="ltr">
              {userEmail}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </header>

        <main className="admin-main p-10 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
