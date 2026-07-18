"use client";

import type { ReactNode } from "react";
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
  ShieldAlert, // ✅ أضف ده
} from "lucide-react";
import type { AdminRole } from "@/lib/admin/permissions";

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
    { name: "Categories", href: "/admin/categories", icon: Tag },
    { name: "Orders", href: "/admin/orders", icon: Package },
    { name: "Archive", href: "/admin/orders/archive", icon: Package },
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
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col shadow-sm">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
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
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 italic text-[10px] text-gray-400 px-8">
          v1.0.0 Stable Architecture
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-30">
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

        <main className="p-10 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
