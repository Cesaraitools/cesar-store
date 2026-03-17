"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  FileText, 
  Truck, 
  Home, 
  MessageCircle
} from "lucide-react";

// ✅ Prevent prerender (CRITICAL)
export const dynamic = "force-dynamic";

type InvoiceData = {
  invoice: {
    order_id: string;
    issued_at: string;
    currency: string;
  };
  items: {
    name: string;
    price: number;
    quantity: number;
  }[];
  totals: {
    total: number;
  };
};

export default function ConfirmPage() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (!orderId) return;

    async function load() {
      try {
        const res = await fetch(`/api/invoice/${orderId}`);
        if (!res.ok) return;

        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-right" dir="rtl">
      
      <div className="max-w-md w-full relative">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-green-50 rounded-full blur-3xl opacity-70"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-70"></div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 text-center relative overflow-hidden">
          
          <div className="flex justify-center mb-8 relative">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center text-green-500 relative z-10 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 w-24 h-24 bg-green-100 rounded-full blur-xl scale-125 opacity-30 mx-auto"></div>
          </div>

          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
            تم استلام طلبك!
          </h1>
          
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">
            شكراً لثقتك في <span className="text-blue-600 font-black">متجر سيزر</span> 
            <br />
            <span className="text-sm">طلبك الآن في مرحلة المراجعة وسنتواصل معك قريباً.</span>
          </p>

          {orderId && (
            <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100 inline-block px-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">رقم الطلب الخاص بك</p>
              <p className="text-lg font-black text-slate-800 font-mono tracking-tighter">#{orderId.slice(0, 8)}</p>
            </div>
          )}

          <div className="space-y-3">
            
            <a
              href={`/api/invoice/${orderId}/pdf`}
              target="_blank"
              className="group flex items-center justify-center gap-3 w-full bg-slate-900 text-white py-4 rounded-2xl font-black transition-all hover:bg-black active:scale-[0.98] shadow-xl shadow-slate-200"
            >
              <FileText size={18} className="text-slate-400 group-hover:text-white transition-colors" />
              تحميل الفاتورة (PDF)
            </a>

            <Link
              href={`/orders/${orderId}`}
              className="flex items-center justify-center gap-3 w-full bg-white text-blue-600 border-2 border-blue-50 py-4 rounded-2xl font-black transition-all hover:bg-blue-50 active:scale-[0.98]"
            >
              <Truck size={18} />
              تتبع حالة الطلب
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full text-slate-400 py-3 rounded-2xl font-bold hover:text-slate-600 transition-colors text-sm"
            >
              <Home size={16} />
              العودة للرئيسية
            </Link>

          </div>

          <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">هل لديك استفسار؟</p>
                <p className="text-xs font-black text-slate-700">تواصل معنا عبر واتساب</p>
             </div>
             <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-100">
                <MessageCircle size={20} fill="currentColor" />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}