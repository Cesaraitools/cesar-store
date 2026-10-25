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
          buttonClass:
            "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100",
        },
        {
          href: "/wholesale/orders",
          label: isAr ? "طلبات الجملة" : "WHOLESALE ORDERS",
          icon: Package,
          authOnly: true,
          buttonClass:
            "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
        },
      ]
    : [
        {
          href: "/shop",
          label: isAr ? "متجر التجزئة" : "RETAIL SHOP",
          buttonClass:
            "border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100",
        },
        {
          href: "/wholesale",
          label: isAr ? "متجر الجملة" : "WHOLESALE SHOP",
          buttonClass:
            "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100",
        },
        {
          href: "/orders",
          label: isAr ? "طلباتي" : "MY ORDERS",
          icon: Package,
          authOnly: true,
          buttonClass:
            "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
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
      className="sticky top-0 z-[100] w-full border-b border-violet-100 bg-white/95 shadow-[0_10px_30px_-24px_rgba(49,46,129,0.45)] backdrop-blur-md transition-all duration-300"
      aria-label={isAr ? "التنقل الرئيسي" : "Main navigation"}
    >
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-3 px-4 md:h-28 md:px-6">
        
        {/* Logo Section */}
        <Link
          href={homeHref}
          prefetch={false}
          className="flex shrink-0 items-center gap-2 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-2.5 py-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md active:scale-95 md:gap-3 md:px-4"
        >
          <Image
            src="/icon-192.png"
            alt="Cesar Store Logo"
            width={56}
            height={56}
            priority
            className="h-11 w-11 object-contain drop-shadow-sm md:h-14 md:w-14"
          />
          <span className="hidden text-base font-black tracking-tight text-rose-950 min-[390px]:inline sm:text-lg md:text-2xl">
            {isAr ? "متجر سيزر" : "CESAR STORE"}
          </span>
        </Link>

        {/* Desktop Actions */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3" dir={isAr ? "rtl" : "ltr"}>
          
          {/* Navigation Links */}
          <div className="mx-2 hidden items-center gap-2 lg:flex">
            {navigationLinks
              .filter((link) => !link.authOnly || (!loading && user))
              .map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    className={`flex min-h-12 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${link.buttonClass}`}
                  >
                    {Icon ? <Icon size={18} strokeWidth={2.4} /> : null}
                    {link.label}
                  </Link>
                );
              })}
          </div>

          <div className="hidden h-8 w-px bg-violet-100 lg:block"></div>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex min-h-11 items-center gap-1.5 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2.5 text-[11px] font-black text-fuchsia-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-fuchsia-300 hover:bg-fuchsia-100 hover:shadow-md active:scale-90 md:min-h-12 md:px-4 md:text-xs"
          >
            <Globe size={17} className="text-fuchsia-600" />
            {isAr ? "ENGLISH" : "العربية"}
          </button>

          {/* Auth Section */}
          <div className="flex items-center gap-2 md:gap-3">
            <>
                {user ? (
                  <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-1.5 shadow-sm md:min-h-12 md:px-2.5">
                    <span className="hidden max-w-[130px] truncate text-xs font-black text-emerald-800 lg:block">
                      {user.email}
                    </span>
                    <button
                      onClick={signOut}
                      className="rounded-xl bg-white p-2 text-rose-500 shadow-sm transition-all hover:bg-rose-500 hover:text-white active:scale-90 md:p-2.5"
                      aria-label={isAr ? "تسجيل الخروج" : "Log out"}
                      title={isAr ? "تسجيل الخروج" : "Logout"}
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/auth/login"
                      prefetch={false}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md md:min-h-12 md:min-w-12"
                      aria-label={isAr ? "تسجيل الدخول" : "Log in"}
                      title={isAr ? "تسجيل الدخول" : "Login"}
                    >
                      <LogIn size={22} />
                    </Link>
                  </div>
                )}
              </>

            {/* Cart Button */}
            <Link
              href={cartHref}
              prefetch={false}
              className="group relative flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-teal-500 p-2.5 text-white shadow-lg shadow-teal-200/60 transition-all hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-teal-300/70 active:scale-90 md:min-h-12 md:min-w-12 md:p-3"
              aria-label={isAr ? "فتح السلة" : "Open cart"}
            >
              <ShoppingCart size={22} className="transition-transform group-hover:rotate-12" />

              {cartBadgeCount > 0 && (
                <span className="animate-in zoom-in absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-black text-white">
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
              prefetch={false}
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
