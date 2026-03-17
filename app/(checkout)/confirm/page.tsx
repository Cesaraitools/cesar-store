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

export default function ConfirmClient() {
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
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 text-center">

          <div className="flex justify-center mb-8">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>

          <h1 className="text-2xl font-black mb-3">
            تم استلام طلبك!
          </h1>

          {orderId && (
            <p className="mb-6 font-mono">#{orderId.slice(0, 8)}</p>
          )}

          <div className="space-y-3">

            <a
              href={`/api/invoice/${orderId}/pdf`}
              target="_blank"
              className="block bg-black text-white py-3 rounded-xl"
            >
              تحميل الفاتورة
            </a>

            <Link href={`/orders/${orderId}`} className="block text-blue-600">
              تتبع الطلب
            </Link>

            <Link href="/" className="block text-gray-400">
              الرئيسية
            </Link>

          </div>

          <div className="mt-6 flex justify-center items-center gap-2 text-sm">
            <MessageCircle size={16} />
            واتساب للدعم
          </div>

        </div>
      </div>
    </div>
  );
}