import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  FileText,
  LockKeyhole,
  PackageCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "تجارة الجملة",
  description:
    "انضم إلى برنامج تجارة الجملة من Cesar Store بعد مراجعة بيانات الكيان التجاري والمستندات الرسمية.",
};

const steps = [
  {
    title: "تقديم البيانات",
    description: "املأ بيانات الكيان التجاري وارفع المستندات المطلوبة للمراجعة.",
    icon: FileText,
  },
  {
    title: "مراجعة سيزر",
    description: "يراجع فريق سيزر البطاقة الشخصية والبطاقة الضريبية والسجل التجاري.",
    icon: ClipboardCheck,
  },
  {
    title: "تفعيل حساب الجملة",
    description: "بعد الموافقة يتم تفعيل دخول الجملة وإتاحة الأسعار والحد الأدنى للشراء.",
    icon: LockKeyhole,
  },
];

const requirements = [
  "بطاقة الرقم القومي لصاحب الكيان",
  "البطاقة الضريبية",
  "السجل التجاري",
  "رقم واتساب مخصص للتواصل والطلبات",
];

export default function WholesalePage() {
  return (
    <div dir="rtl" className="bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-h-[70vh] max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-16">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
            <Building2 className="h-4 w-4 text-orange-600" />
            Cesar Store Wholesale
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-slate-950 md:text-6xl">
              بوابة مستقلة لتجارة الجملة من سيزر ستور
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              أسعار الجملة وشروط الشراء الخاصة تظهر فقط للكيانات المعتمدة بعد
              مراجعة المستندات الرسمية والموافقة من فريق سيزر.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/wholesale/apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-orange-600"
            >
              تقديم طلب انضمام
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/wholesale/catalog"
              className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-6 py-4 text-sm font-black text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
            >
              كتالوج الجملة
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              تواصل مع سيزر
            </Link>
            <Link
              href="/wholesale/status"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              متابعة طلب سابق
            </Link>
            <Link
              href="/wholesale/account"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              دخول حساب الجملة
            </Link>
            <Link
              href="/wholesale/orders"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              متابعة طلبات الجملة
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
          <div className="rounded-xl bg-slate-950 p-6 text-white">
            <PackageCheck className="mb-8 h-10 w-10 text-orange-400" />
            <h2 className="text-2xl font-black">قبل عرض أسعار الجملة</h2>
            <p className="mt-3 leading-7 text-slate-300">
              يتم التحقق من الكيان التجاري أولًا، ثم تفعيل الوصول لقسم الجملة
              بأسعار وحدود شراء مختلفة عن القطاعي.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {requirements.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-3 md:px-8">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <step.icon className="h-8 w-8 text-orange-600" />
              <h3 className="mt-5 text-xl font-black text-slate-950">
                {step.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
