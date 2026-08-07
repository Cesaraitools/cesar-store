"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useWholesaleCart } from "@/context/WholesaleDbCartContext";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  LogOut,
  Globe,
  Package,
  LogIn,
  Store,
  LoaderCircle,
} from "lucide-react";

export default function Navbar() {
  const { cartItems } = useCart();
  const { itemCount: wholesaleCartCount } = useWholesaleCart();
  const { lang, toggleLang } = useLanguage();
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [pendingMobileHref, setPendingMobileHref] = useState<string | null>(null);
  const isAr = lang === "ar";
  const isWholesaleSection = pathname?.startsWith("/wholesale") || false;
  const homeHref = isWholesaleSection ? "/wholesale" : "/";
  const cartHref = isWholesaleSection ? "/wholesale/order" : "/cart";
  const cartBadgeCount = isWholesaleSection
    ? wholesaleCartCount
    : cartItems.length;
  const mobileNavigationLinks = isWholesaleSection
    ? [
        {
          href: "/wholesale",
          label: isAr ? "الرئيسية" : "Home",
          icon: Home,
        },
        {
          href: "/wholesale/catalog",
          label: isAr ? "الجملة" : "Wholesale",
          icon: Store,
        },
        {
          href: "/wholesale/orders",
          label: isAr ? "طلباتي" : "Orders",
          icon: Package,
          authOnly: true,
        },
        {
          href: "/wholesale/order",
          label: isAr ? "السلة" : "Cart",
          icon: ShoppingCart,
          badge: wholesaleCartCount,
        },
      ]
    : [
        {
          href: "/",
          label: isAr ? "الرئيسية" : "Home",
          icon: Home,
        },
        {
          href: "/shop",
          label: isAr ? "المتجر" : "Shop",
          icon: Store,
        },
        {
          href: "/categories",
          label: isAr ? "الأقسام" : "Categories",
          icon: LayoutGrid,
        },
        {
          href: "/orders",
          label: isAr ? "طلباتي" : "Orders",
          icon: Package,
          authOnly: true,
        },
        {
          href: "/cart",
          label: isAr ? "السلة" : "Cart",
          icon: ShoppingCart,
          badge: cartItems.length,
        },
      ];
  const navigationLinks = isWholesaleSection
    ? [
        {
          href: "/wholesale/catalog",
          label: isAr ? "متجر الجملة" : "WHOLESALE SHOP",
          icon: Store,
        },
        {
          href: "/wholesale/orders",
          label: isAr ? "طلبات الجملة" : "WHOLESALE ORDERS",
          icon: Package,
          authOnly: true,
        },
      ]
    : [
        {
          href: "/shop",
          label: isAr ? "متجر التجزئة" : "RETAIL SHOP",
        },
        {
          href: "/wholesale",
          label: isAr ? "متجر الجملة" : "WHOLESALE SHOP",
        },
        {
          href: "/orders",
          label: isAr ? "طلباتي" : "MY ORDERS",
          icon: Package,
          authOnly: true,
        },
      ];

  const visibleMobileLinks = mobileNavigationLinks.filter(
    (link) => !link.authOnly || (!loading && user)
  );

  useEffect(() => {
    setPendingMobileHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingMobileHref) return;

    const recoveryTimer = window.setTimeout(() => {
      setPendingMobileHref(null);
    }, 4000);

    return () => window.clearTimeout(recoveryTimer);
  }, [pendingMobileHref]);

  return (
    <>
    <nav
      className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[100] transition-all duration-300"
      aria-label={isAr ? "التنقل الرئيسي" : "Main navigation"}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link
          href={homeHref}
          className="flex items-center gap-3 transition-transform active:scale-95"
        >
          <Image
            src="/navlogo.png"
            alt="Cesar Store Logo"
            width={40}
            height={40}
            className="w-10 h-10 object-contain drop-shadow-sm"
          />
          <span className="text-xl font-black text-gray-900 tracking-tighter">
            {isAr ? "متجر سيزر" : "CESAR STORE"}
          </span>
        </Link>

        {/* Desktop Actions */}
        <div className="flex items-center gap-2 md:gap-6" dir={isAr ? "rtl" : "ltr"}>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 ml-4 mr-4">
            {navigationLinks
              .filter((link) => !link.authOnly || (!loading && user))
              .map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 text-sm font-black text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {Icon ? <Icon size={16} /> : null}
                    {link.label}
                  </Link>
                );
              })}
          </div>

          <div className="h-6 w-[1px] bg-gray-100 hidden md:block"></div>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50 text-[11px] font-black text-gray-600 hover:bg-white hover:shadow-sm transition-all active:scale-90"
          >
            <Globe size={14} className="text-blue-500" />
            {isAr ? "ENGLISH" : "العربية"}
          </button>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-3 bg-gray-50 p-1 pr-3 rounded-full border border-gray-100">
                    <span className="hidden lg:block text-[11px] font-black text-gray-400 truncate max-w-[120px]">
                      {user.email}
                    </span>
                    <button
                      onClick={signOut}
                      className="p-2 bg-white text-rose-500 rounded-full shadow-sm hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                      aria-label={isAr ? "تسجيل الخروج" : "Log out"}
                      title={isAr ? "تسجيل الخروج" : "Logout"}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/auth/login"
                      className="p-2.5 text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label={isAr ? "تسجيل الدخول" : "Log in"}
                      title={isAr ? "تسجيل الدخول" : "Login"}
                    >
                      <LogIn size={20} />
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Cart Button */}
            <Link
              href={cartHref}
              className="relative group p-2.5 bg-gray-900 text-white rounded-2xl shadow-lg shadow-gray-200 hover:bg-blue-600 transition-all active:scale-90"
              aria-label={isAr ? "فتح السلة" : "Open cart"}
            >
              <ShoppingCart size={20} className="group-hover:rotate-12 transition-transform" />

              {cartBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                  {cartBadgeCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
    <nav
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur-md md:hidden"
      dir={isAr ? "rtl" : "ltr"}
      aria-label={isAr ? "تنقل التطبيق" : "App navigation"}
    >
      <div
        className={`mx-auto grid max-w-md ${
          visibleMobileLinks.length >= 5 ? "grid-cols-5" : "grid-cols-4"
        } gap-1`}
      >
        {visibleMobileLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname?.startsWith(link.href));
          const isPending = pendingMobileHref === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              aria-busy={isPending || undefined}
              onClick={() => {
                if (!isActive) {
                  setPendingMobileHref(link.href);
                }
              }}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition-all active:scale-95 ${
                isActive || isPending
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isPending ? "pointer-events-none" : ""}`}
            >
              <span className="relative">
                {isPending ? (
                  <LoaderCircle size={20} strokeWidth={2.4} className="animate-spin" />
                ) : (
                  <Icon size={20} strokeWidth={2.4} />
                )}
                {typeof link.badge === "number" && link.badge > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-black text-white ring-2 ring-white">
                    {link.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
