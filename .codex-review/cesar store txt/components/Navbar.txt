"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ShoppingCart, User, LogOut, Globe, Package, LogIn, UserPlus } from "lucide-react";

export default function Navbar() {
  const { cartItems } = useCart();
  const { lang, toggleLang } = useLanguage();
  const { user, loading, signOut } = useAuth();
  const isAr = lang === "ar";

  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[100] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-transform active:scale-95"
        >
          <img
            src="/navlogo.png"
            alt="Cesar Store Logo"
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
            <Link href="/shop" className="text-sm font-black text-gray-500 hover:text-blue-600 transition-colors">
              {isAr ? "المتجر" : "SHOP"}
            </Link>
            
            {!loading && user && (
              <Link
                href="/orders"
                className="flex items-center gap-1.5 text-sm font-black text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Package size={16} />
                {isAr ? "طلباتي" : "MY ORDERS"}
              </Link>
            )}
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
                      title={isAr ? "تسجيل الدخول" : "Login"}
                    >
                      <LogIn size={20} />
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Cart Button */}
            <Link href="/cart" className="relative group p-2.5 bg-gray-900 text-white rounded-2xl shadow-lg shadow-gray-200 hover:bg-blue-600 transition-all active:scale-90">
              <ShoppingCart size={20} className="group-hover:rotate-12 transition-transform" />

              {cartItems.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}