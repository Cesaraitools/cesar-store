"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Boxes, LineChart, TrendingUp, Filter } from "lucide-react";

// تأكيد تعريف دالة التنسيق داخل الملف
function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

export default function AdminChartsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: "", to: "", status: "" });

  useEffect(() => {
    async function loadCharts() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/analytics`, { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Charts load error");
      } finally {
        setLoading(false);
      }
    }
    loadCharts();
  }, [filters]);

  const groupedCategorySales = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, any[]>();
    for (const row of data.categorySales) {
      const current = groups.get(row.currency) || [];
      current.push(row);
      groups.set(row.currency, current);
    }
    return Array.from(groups.entries()).map(([currency, rows]) => ({ currency, rows }));
  }, [data]);

  if (loading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse">جاري بناء الرسوم...</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4 md:p-8 space-y-8" dir="rtl">
      <header className="flex flex-col lg:flex-row justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900">مبيعات الأقسام</h1>
          <p className="text-slate-500 font-bold text-sm">مقارنة بصرية شاملة لأداء الفئات</p>
        </div>
        <Link href="/admin/analytics" className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200">
           العودة للتحليلات <ArrowRight size={18} className="rotate-180"/>
        </Link>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {groupedCategorySales.map((group) => (
          <div key={group.currency} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-800 border-r-4 border-indigo-600 pr-4">
              مبيعات الأقسام ({group.currency})
            </h2>
            <CategoryBars rows={group.rows} mode="sales" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBars({ rows, mode }: { rows: any[]; mode: "sales" | "units" }) {
  const maxValue = Math.max(...rows.map((row) => (mode === "sales" ? row.gross_sales : row.units_sold)), 0);

  return (
    <div className="space-y-6">
      {rows.map((row) => {
        const value = mode === "sales" ? row.gross_sales : row.units_sold;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const isSales = mode === "sales";

        return (
          <div key={row.category} className="group">
            <div className="flex justify-between items-end mb-2">
              <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{row.category}</span>
              <span className="font-black text-indigo-600">
                {isSales ? formatMoney(value, row.currency) : `${value} قطعة`}
              </span>
            </div>
            <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
              <div 
                className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${isSales ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-500'}`}
                style={{ width: `${Math.max(percentage, 5)}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}