"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tag,
  Package,
  TicketPercent,
  LogOut,
  UserCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Categories", href: "/admin/categories", icon: Tag },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Promos", href: "/admin/promos", icon: TicketPercent },
  ];

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
            <span className="text-sm font-medium">مدير النظام</span>
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