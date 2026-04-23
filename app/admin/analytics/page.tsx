"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  LineChart,
  RotateCcw,
  Trash2,
  Filter,
  BarChart3,
  Calendar,
  Box,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  ArrowRight
} from "lucide-react";

/* ---------------- المنطق البرمجي الأصلي (لم يتم تغيير حرف واحد) ---------------- */
type CategorySalesRow = {
  category: string;
  currency: string;
  units_sold: number;
  orders_count: number;
  gross_sales: number;
};

type AnalyticsResponse = {
  volume: { total_orders: number };
  reliability: { cancel_rate: number };
  financials: Array<{ currency: string; revenue_sum: number; avg_order_value: number }>;
  productSales: Array<{ product_name: string; category: string; units_sold: number; gross_sales: number; currency: string }>;
  categorySales: CategorySalesRow[];
};

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ from: "", to: "", status: "" });

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.status) params.set("status", filters.status);

        const res = await fetch(`/api/admin/analytics?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [filters]);

  if (loading) return <div className="p-20 text-center font-black text-blue-600 animate-pulse">جاري جلب البيانات بدقة...</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden pb-12" dir="rtl">
      {/* تأثيرات خلفية خفيفة */}
      <div className="absolute top-[-5%] left-[-5%] w-96 h-96 bg-blue-200/20 rounded-full blur-[100px] -z-0"></div>

      <div className="relative z-10 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* Header - تصميم عصري مع الحفاظ على الروابط */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/70 backdrop-blur-lg p-6 rounded-[2rem] border border-white shadow-xl shadow-blue-900/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">لوحة تحليلات سيزر</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider tracking-tighter">إدارة البيانات الذكية</p>
            </div>
          </div>
          <Link href="/admin/charts" className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-100 rounded-xl font-black transition-all shadow-sm">
            <LineChart size={18} /> عرض الرسوم البيانية <ArrowRight size={16} className="rotate-180"/>
          </Link>
        </header>

        {/* KPI Cards - استرجاع منطق العملات المتعددة */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="إجمالي الطلبات" value={data?.volume.total_orders} icon={<Box />} color="from-blue-500 to-indigo-600" />
          
          <MetricCard 
            title="صافي الإيرادات" 
            // هذا هو المنطق الأصلي لعرض كل العملات النشطة
            value={data?.financials.map(f => formatMoney(f.revenue_sum, f.currency)).join(" / ") || "0"} 
            icon={<DollarSign />} 
            color="from-emerald-500 to-teal-600" 
          />

          <MetricCard 
            title="معدل الإلغاء" 
            value={`${((data?.reliability.cancel_rate || 0) * 100).toFixed(1)}%`} 
            icon={<AlertTriangle />} 
            color="from-rose-500 to-orange-600" 
          />

          <MetricCard 
            title="أفضل المنتجات مبيعاً" 
            value={data?.productSales[0]?.product_name || "—"} 
            icon={<BarChart3 />} 
            color="from-amber-500 to-orange-500"
            isSmall
          />
        </section>

        {/* Filters - استرجاع منطق التصفية */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 mb-6 text-slate-800 font-black">
              <Filter size={18} className="text-blue-600" /> تخصيص البحث
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2 uppercase">من تاريخ</label>
                <input 
                  type="date" 
                  value={filters.from}
                  onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full rounded-xl border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2 uppercase">إلى تاريخ</label>
                <input 
                  type="date" 
                  value={filters.to}
                  onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full rounded-xl border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2 uppercase">الحالة</label>
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-xl border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">كل الحالات</option>
                  <option value="delivered">Delivered</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
           </div>
        </section>

        {/* Tables - استرجاع منطق عرض الجداول الأصلي */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 overflow-hidden">
                <h3 className="font-black text-slate-800 mb-4 px-2">أداء الأقسام</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase">
                            <tr>
                                <th className="p-4">القسم</th>
                                <th className="p-4">المبيعات</th>
                                <th className="p-4">الكمية</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-slate-700">
                            {data?.categorySales.map((row, i) => (
                                <tr key={i} className="border-t border-slate-50 hover:bg-blue-50/30 transition-colors">
                                    <td className="p-4">{row.category}</td>
                                    <td className="p-4 text-blue-600">{formatMoney(row.gross_sales, row.currency)}</td>
                                    <td className="p-4">{row.units_sold}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 overflow-hidden">
                <h3 className="font-black text-slate-800 mb-4 px-2">أفضل المنتجات</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase">
                            <tr>
                                <th className="p-4">المنتج</th>
                                <th className="p-4">القسم</th>
                                <th className="p-4">الإيراد</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-slate-700">
                            {data?.productSales.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-t border-slate-50 hover:bg-emerald-50/30 transition-colors">
                                    <td className="p-4 truncate max-w-[150px]">{row.product_name}</td>
                                    <td className="p-4 text-slate-400 text-xs">{row.category}</td>
                                    <td className="p-4 text-emerald-600">{formatMoney(row.gross_sales, row.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, isSmall }: any) {
  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] p-6 text-white shadow-lg bg-gradient-to-br ${color} transition-transform hover:-translate-y-1`}>
      <div className="absolute top-[-10%] right-[-10%] opacity-20 transform scale-150">{icon}</div>
      <div className="relative z-10 space-y-1">
        <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">{title}</p>
        <p className={`${isSmall ? 'text-base' : 'text-xl'} font-black truncate`}>{value || 0}</p>
      </div>
    </div>
  );
}