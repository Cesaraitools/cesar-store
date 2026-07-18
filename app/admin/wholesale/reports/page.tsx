"use client";

import Link from "next/link";
import { BarChart3, Download, FileText, Package, RotateCcw } from "lucide-react";

export default function AdminWholesaleReportsPage() {
  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">تقارير وتصدير الجملة</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          نقطة واحدة للوصول إلى تقارير طلبات الجملة والتصديرات الإدارية.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportLink
          href="/admin/wholesale/orders"
          icon={Package}
          title="تقارير الطلبات"
          description="افتح أي طلب جملة ثم استخدم تقرير PDF المحمي الخاص به."
        />
        <ReportLink
          href="/admin/wholesale/returns"
          icon={RotateCcw}
          title="تصدير المردودات"
          description="صفحة المردودات تحتوي على تصدير CSV للبيانات المعروضة."
        />
        <ReportLink
          href="/admin/wholesale/customers"
          icon={Download}
          title="تصدير العملاء"
          description="صفحة العملاء تحتوي على تصدير CSV للحسابات وحالة الربط."
        />
        <ReportLink
          href="/admin/wholesale/analytics"
          icon={BarChart3}
          title="تصدير التحليلات"
          description="صفحة التحليلات تحتوي على تصدير CSV لطلبات الجملة."
        />
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
        مراجعة PDF العربي وQR تتبع الطلب ما زالت بندًا تنفيذيًا لاحقًا بعد تثبيت صفحة
        تفاصيل طلب الجملة، حتى لا نخلط تحسين التقارير مع منطق إدارة الطلب.
      </div>
    </div>
  );
}

function ReportLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
    >
      <Icon className="h-6 w-6 text-blue-700" />
      <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
        {description}
      </p>
    </Link>
  );
}
