"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { WholesaleCustomerStatus } from "@/types/wholesale";

type WholesaleAccount = {
  id: string;
  applicationId: string;
  businessName: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  status: WholesaleCustomerStatus;
  approvedAt: string | null;
  updatedAt: string | null;
};

const statusContent: Record<
  WholesaleCustomerStatus,
  {
    label: string;
    title: string;
    description: string;
    className: string;
    icon: typeof LockKeyhole;
  }
> = {
  pending_account: {
    label: "بانتظار التفعيل",
    title: "ملف الجملة جاهز ولم يتم ربط الحساب بعد",
    description:
      "بعد موافقة سيزر على الطلب، سيقوم فريق الإدارة بربط حسابك المسجل لتفعيل كتالوج وأسعار الجملة.",
    className: "border-amber-100 bg-amber-50 text-amber-700",
    icon: LockKeyhole,
  },
  active: {
    label: "نشط",
    title: "حساب الجملة مفعل",
    description:
      "يمكن استخدام هذا الحساب للوصول إلى كتالوج الجملة والأسعار وطلبات الجملة مباشرة.",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  suspended: {
    label: "موقوف",
    title: "حساب الجملة موقوف مؤقتا",
    description:
      "تواصل مع فريق سيزر لمراجعة حالة الحساب قبل استخدام أسعار وطلبات الجملة.",
    className: "border-rose-100 bg-rose-50 text-rose-700",
    icon: ShieldAlert,
  },
};

export default function WholesaleAccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [account, setAccount] = useState<WholesaleAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;

    async function loadAccount() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/wholesale/account", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "تعذر تحميل حساب الجملة");
        }

        if (isMounted) {
          setAccount(payload.wholesaleCustomer || null);
        }
      } catch (accountError) {
        if (isMounted) {
          setError(
            accountError instanceof Error
              ? accountError.message
              : "تعذر تحميل حساب الجملة"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  const status = account ? statusContent[account.status] : null;

  return (
    <div dir="rtl" className="min-h-[75vh] bg-slate-50 px-4 py-10 text-slate-950 md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/wholesale"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لقسم الجملة
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
                <Building2 className="h-4 w-4 text-orange-600" />
                حساب تجارة الجملة
              </div>
              <h1 className="mt-5 text-3xl font-black text-slate-950">
                حالة الوصول إلى قسم الجملة
              </h1>
              <p className="mt-3 max-w-2xl leading-8 text-slate-600">
                أسعار الجملة تظهر فقط للحسابات المعتمدة والمربوطة من إدارة سيزر.
              </p>
            </div>
          </div>

          {authLoading || loading ? (
            <div className="mt-8 flex min-h-56 items-center justify-center rounded-xl bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : !user ? (
            <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-800">
              <LockKeyhole className="h-9 w-9" />
              <h2 className="mt-4 text-2xl font-black">سجل الدخول أولا</h2>
              <p className="mt-3 leading-7">
                يجب تسجيل الدخول بالحساب الذي ستقوم إدارة سيزر بربطه بملف الجملة الخاص بك.
              </p>
              <Link
                href="/auth/login?redirect=/wholesale/account"
                className="mt-5 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-orange-600"
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : error ? (
            <div className="mt-8 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-700">
              <ShieldAlert className="h-9 w-9" />
              <h2 className="mt-4 text-2xl font-black">تعذر تحميل الحالة</h2>
              <p className="mt-3 leading-7">{error}</p>
            </div>
          ) : !account || !status ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <LockKeyhole className="h-9 w-9 text-slate-400" />
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                لا يوجد حساب جملة مفعل لهذا المستخدم
              </h2>
              <p className="mt-3 leading-7">
                إذا كان طلبك تمت الموافقة عليه، تأكد أن الإدارة قامت بربط نفس بريد تسجيل الدخول بملف الجملة.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/wholesale/apply"
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
                >
                  تقديم طلب جملة
                </Link>
                <Link
                  href="/wholesale/status"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                >
                  متابعة طلب سابق
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div className={`rounded-2xl border p-6 ${status.className}`}>
                <status.icon className="h-9 w-9" />
                <div className="mt-4 text-sm font-black">{status.label}</div>
                <h2 className="mt-2 text-2xl font-black">{status.title}</h2>
                <p className="mt-3 leading-7">{status.description}</p>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <Info label="اسم الكيان" value={account.businessName} />
                <Info label="اسم المسؤول" value={account.contactName} />
                <Info label="الهاتف" value={account.phone} />
                <Info label="واتساب" value={account.whatsapp} />
                <Info label="البريد المرتبط" value={account.email || user.email || "-"} />
                <Info label="رقم ملف الجملة" value={account.applicationId} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/wholesale/catalog"
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
                >
                  فتح كتالوج الجملة
                </Link>
                <Link
                  href="/wholesale/orders"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                >
                  متابعة طلبات الجملة
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}
