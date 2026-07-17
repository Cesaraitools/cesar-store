"use client";

import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CONTACT_WHATSAPP_URL } from "@/lib/seo";
import {
  CheckCircle2,
  Truck,
  Home,
  MessageCircle,
  Download,
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

type GoogleSurveyOptInPayload = {
  merchant_id: number;
  order_id: string;
  email: string;
  delivery_country: string;
  estimated_delivery_date: string;
};

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
      surveyoptin?: {
        render: (payload: GoogleSurveyOptInPayload) => void;
      };
    };
  }
}

const GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID = 5797640748;
const GOOGLE_CUSTOMER_REVIEWS_DELIVERY_COUNTRY = "EG";
const ESTIMATED_DELIVERY_DAYS = 5;

function getEstimatedDeliveryDate() {
  const date = new Date();
  date.setDate(date.getDate() + ESTIMATED_DELIVERY_DAYS);
  return date.toISOString().slice(0, 10);
}

function GoogleCustomerReviewsOptIn({
  orderId,
  email,
}: {
  orderId: string;
  email: string;
}) {
  const hasRendered = useRef(false);
  const customerEmail = email.trim();

  const renderOptIn = useCallback(() => {
    if (hasRendered.current || !customerEmail || !orderId) return;

    try {
      window.gapi?.load("surveyoptin", () => {
        if (hasRendered.current || !window.gapi?.surveyoptin?.render) return;

        window.gapi.surveyoptin.render({
          merchant_id: GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID,
          order_id: orderId,
          email: customerEmail,
          delivery_country: GOOGLE_CUSTOMER_REVIEWS_DELIVERY_COUNTRY,
          estimated_delivery_date: getEstimatedDeliveryDate(),
        });

        hasRendered.current = true;
      });
    } catch (error) {
      console.warn("Google Customer Reviews opt-in failed to render", error);
    }
  }, [customerEmail, orderId]);

  useEffect(() => {
    renderOptIn();
  }, [renderOptIn]);

  if (!customerEmail || !orderId) return null;

  return (
    <Script
      src="https://apis.google.com/js/platform.js"
      strategy="afterInteractive"
      onLoad={renderOptIn}
    />
  );
}

export default function ConfirmClient() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const { user } = useAuth();

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
    <>
      {invoice && orderId && user?.email && (
        <GoogleCustomerReviewsOptIn orderId={orderId} email={user.email} />
      )}

      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-right font-sans" dir="rtl">
      {/* الخلفية التجميلية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-slate-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-md w-full relative group">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white p-10 text-center relative z-10 overflow-hidden">
          
          {/* أيقونة النجاح مع تأثير نبضي */}
          <div className="flex justify-center mb-8 relative">
            <div className="absolute inset-0 bg-green-100 rounded-full scale-150 blur-xl opacity-20 animate-pulse" />
            <div className="relative animate-bounce duration-1000">
              <CheckCircle2 size={72} className="text-green-500 stroke-[1.5]" />
            </div>
          </div>

          <h1 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">
            تم استلام طلبك!
          </h1>
          
          <p className="text-slate-500 mb-2">شكراً لثقتك بمتجر سيزر</p>

          {orderId && (
            <div className="inline-block px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full mb-8">
              <p className="font-mono text-sm text-slate-600 font-bold uppercase tracking-wider">
                رقم الطلب: #{orderId.slice(0, 8)}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* زر تحميل الفاتورة - تفاعلي */}
            <a
              href={`/api/invoice/${orderId}/pdf`}
              target="_blank"
              className="group flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-200 active:scale-95"
            >
              <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
              <span className="font-bold text-lg">تحميل الفاتورة</span>
            </a>

            {/* زر تتبع الطلب - ناعم */}
            <Link 
              href={`/orders/${orderId}`} 
              className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 py-4 rounded-2xl transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 active:scale-95 shadow-sm"
            >
              <Truck size={20} className="text-blue-500" />
              <span className="font-bold text-lg">تتبع حالة الشحن</span>
            </Link>

            {/* زر العودة للرئيسية */}
            <Link 
              href="/" 
              className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 transition-colors py-2 text-sm font-medium"
            >
              <Home size={16} />
              العودة للرئيسية
            </Link>
          </div>

          {/* تذييل الصفحة - الدعم الفني */}
          <div className="mt-10 pt-8 border-t border-slate-50">
            <a 
              href={CONTACT_WHATSAPP_URL}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-full text-sm font-bold hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={18} className="fill-green-700/10" />
              تحتاج مساعدة؟ تواصل معنا واتساب
            </a>
          </div>

        </div>
      </div>
      </div>
    </>
  );
}
