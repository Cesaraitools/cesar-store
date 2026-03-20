"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// إضافة الاستيراد المفقود الذي تسبب في الخطأ
import { ShoppingBag, ArrowRight, ShieldAlert, Sparkles, Package } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleForceLogoutAll() {
    const confirmed = window.confirm("هل أنت متأكد؟\nسيتم تسجيل خروج جميع مديري النظام النشطين.");
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch("/api/admin/force-logout", { method: "POST" });
      if (!res.ok) {
        alert("فشل تسجيل خروج الجلسات");
        return;
      }
      router.push("/admin/login");
      router.refresh();
    } catch {
      alert("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            لوحة التحكم <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">الرئيسية</span>
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            مرحباً بك في نظام إدارة Cesar Store.
          </p>
        </div>

        <button
          onClick={handleForceLogoutAll}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
        >
          <ShieldAlert className="w-4 h-4" />
          {loading ? "جاري الخروج..." : "إنهاء جميع الجلسات"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group relative overflow-hidden rounded-3xl bg-white p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-600 transition-colors duration-500 opacity-20 group-hover:opacity-10" />
          
          <div className="relative space-y-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ShoppingBag className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">إدارة الطلبات</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                راقب الطلبات اللحظية، تتبع حالات الشحن، وراجع فواتير العملاء بدقة.
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform"
            >
              انتقل إلى لوحة الطلبات
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-gray-900 p-8 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h3 className="text-lg font-bold text-blue-400">نظرة عامة على النظام</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              هذه هي اللوحة الرئيسية. سيتم قريباً تفعيل إدارة المنتجات، التصنيفات، والعروض الترويجية من هذا القسم.
            </p>
            <div className="pt-4 flex gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">Products Coming Soon</span>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 opacity-10 transform translate-y-4 translate-x-4">
             {/* الأيقونة التي كانت مسببة للخطأ تم تعريفها الآن */}
             <Package className="w-40 h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}