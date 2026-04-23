"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  LineChart,
  Filter,
  BarChart3,
  Box,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  ArrowRight
} from "lucide-react";

// دالة التنسيق المالي الأصلية
function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: "", to: "", status: "" });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/analytics`, { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading analytics");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filters]);

  if (loading) return <div className="p-20 text-center font-black text-blue-600 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden pb-12" dir="rtl">
      <div className="absolute top-[-5%] left-[-5%] w-96 h-96 bg-blue-200/20 rounded-full blur-[100px] -z-0"></div>
      
      <div className="relative z-10 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/70 backdrop-blur-lg p-6 rounded-[2rem] border border-white shadow-xl shadow-blue-900/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">إحصائيات سيزر</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">الأداء العام للمتجر</p>
            </div>
          </div>
          <Link href="/admin/charts" className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-100 rounded-xl font-black transition-all shadow-sm">
            <LineChart size={18} /> عرض الرسوم <ArrowRight size={16} className="rotate-180"/>
          </Link>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard label="إجمالي الطلبات" value={data?.volume.total_orders} icon={<Box />} color="from-blue-500 to-indigo-600" />
          <KpiCard 
            label="صافي الإيرادات" 
            value={data?.financials.map((f: any) => formatMoney(f.revenue_sum, f.currency)).join(" / ")} 
            icon={<DollarSign />} 
            color="from-emerald-500 to-teal-600" 
          />
          <KpiCard label="معدل الإلغاء" value={`${(data?.reliability.cancel_rate * 100).toFixed(1)}%`} icon={<AlertTriangle />} color="from-rose-500 to-orange-600" />
          <KpiCard label="الأكثر مبيعاً" value={data?.productSales[0]?.product_name || "—"} icon={<BarChart3 />} color="from-amber-500 to-orange-500" isSmall />
        </section>

        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
           <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Filter size={18} className="text-blue-600"/> تخصيص النطاق</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-400 mr-2">من تاريخ</span>
                <input type="date" className="w-full rounded-xl border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-400 mr-2">إلى تاريخ</span>
                <input type="date" className="w-full rounded-xl border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-400 mr-2">حالة الطلب</span>
                <select className="w-full rounded-xl border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100">
                  <option>الكل</option>
                </select>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, isSmall }: any) {
  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] p-6 text-white shadow-lg transition-transform hover:-translate-y-1 bg-gradient-to-br ${color}`}>
      <div className="absolute top-[-10%] right-[-10%] opacity-20 transform scale-150">{icon}</div>
      <div className="relative z-10 space-y-1">
        <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">{label}</p>
        <p className={`${isSmall ? 'text-base' : 'text-xl'} font-black truncate`}>{value || 0}</p>
      </div>
    </div>
  );
}