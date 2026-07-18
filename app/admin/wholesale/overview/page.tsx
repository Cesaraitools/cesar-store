"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Loader2,
  PackageCheck,
  RotateCcw,
  Users,
} from "lucide-react";

type SummaryPayload = {
  applications: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
  orders: {
    total: number;
    requested: number;
    delivered: number;
    canceled: number;
    revenue: number;
    deliveredRevenue: number;
    averageOrderValue: number;
  };
  returns: {
    records: number;
    returnedUnits: number;
  };
  products: {
    total: number;
    enabled: number;
    disabled: number;
    missingPrice: number;
    outOfStock: number;
  };
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("ar-EG")} EGP`;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-bold leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

export default function AdminWholesaleOverviewPage() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/admin/wholesale/summary");
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "تعذر تحميل ملخص الجملة");
        }

        if (active) setSummary(payload.summary);
      } catch (loadError) {
        console.error("Wholesale overview load failed", loadError);
        if (active) setError("فشل تحميل ملخص إدارة الجملة");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">نظرة عامة على الجملة</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          لوحة متابعة مختصرة لطلبات الانضمام، طلبات البيع، المردودات، وإعدادات أسعار الجملة.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="طلبات الانضمام"
              value={summary.applications.total.toLocaleString("ar-EG")}
              hint={`قيد الانتظار: ${summary.applications.pending.toLocaleString("ar-EG")}، موافق عليه: ${summary.applications.approved.toLocaleString("ar-EG")}`}
              icon={ClipboardList}
            />
            <StatCard
              label="طلبات الجملة"
              value={summary.orders.total.toLocaleString("ar-EG")}
              hint={`جديدة: ${summary.orders.requested.toLocaleString("ar-EG")}، مسلمة: ${summary.orders.delivered.toLocaleString("ar-EG")}`}
              icon={PackageCheck}
            />
            <StatCard
              label="قيمة الطلبات"
              value={formatMoney(summary.orders.revenue)}
              hint={`متوسط الطلب: ${formatMoney(summary.orders.averageOrderValue)}`}
              icon={BarChart3}
            />
            <StatCard
              label="مردودات الجملة"
              value={summary.returns.records.toLocaleString("ar-EG")}
              hint={`إجمالي القطع المرتجعة: ${summary.returns.returnedUnits.toLocaleString("ar-EG")}`}
              icon={RotateCcw}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Link
              href="/admin/wholesale/customers"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
            >
              <Users className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black text-slate-950">عملاء الجملة</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                متابعة الحسابات النشطة والمعلقة والموقوفة بدون الرجوع لقائمة الطلبات فقط.
              </p>
            </Link>
            <Link
              href="/admin/wholesale/products"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
            >
              <Boxes className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black text-slate-950">إعدادات المنتجات</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                المنتجات تقرأ من التجزئة، والجملة تضيف السعر والحد الأدنى وحالة التفعيل فقط.
              </p>
            </Link>
            <Link
              href="/admin/wholesale/analytics"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
            >
              <BarChart3 className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black text-slate-950">تحليلات الجملة</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                قراءة إدارية لقيمة الطلبات والعملاء والمنتجات الأكثر نشاطًا.
              </p>
            </Link>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
            هذا القسم لا يدير كتالوجًا مستقلًا للجملة. أي تعديل على اسم المنتج أو صوره أو مخزونه
            يظل من شاشة منتجات التجزئة، بينما الجملة تضيف إعدادات البيع بالجملة فقط.
          </div>
        </>
      ) : null}
    </div>
  );
}
