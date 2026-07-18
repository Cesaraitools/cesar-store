import Link from "next/link";
import { ClipboardList, Package, Settings, ShieldAlert } from "lucide-react";

export default function AdminWholesaleSettingsPage() {
  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">إعدادات الجملة</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          ملخص قواعد تشغيل الجملة وروابط الإعدادات الحساسة الموجودة بالفعل.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RuleCard
          icon={Package}
          title="كتالوج الجملة"
          body="أصناف الجملة تقرأ من كتالوج التجزئة. شاشة الجملة تضيف فقط سعر الجملة، الحد الأدنى، الملاحظات، وحالة التفعيل."
        />
        <RuleCard
          icon={ClipboardList}
          title="طلبات الجملة"
          body="الطلب لا يخصم المخزون عند الإرسال. الخصم يتم عند تأكيد الطلب من الإدارة حسب منطق الجملة الحالي."
        />
        <RuleCard
          icon={ShieldAlert}
          title="تصفير الاختبار"
          body="زر تصفير بيانات اختبار الجملة موجود في صفحة طلبات الانضمام ومحمي بصلاحيات المدير الكاملة."
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-slate-950">روابط سريعة</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/wholesale"
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
          >
            طلبات الانضمام وتصفير الاختبار
          </Link>
          <Link
            href="/admin/wholesale/products"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            إعدادات المنتجات
          </Link>
        </div>
      </div>
    </div>
  );
}

function RuleCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Settings;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="h-6 w-6 text-blue-700" />
      <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-slate-500">{body}</p>
    </div>
  );
}
