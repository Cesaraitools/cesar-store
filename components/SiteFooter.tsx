"use client";

import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_E164,
  CONTACT_WHATSAPP_URL,
  SOCIAL_PROFILES,
} from "@/lib/seo";

export default function SiteFooter() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const creditText = isAr
    ? "تصميم وتنفيذ محمد عادل محمود، Chat GPT، Codex"
    : "Designed and implemented by Mohamed Adel Mahmoud, Chat GPT, Codex";

  return (
    <footer
      dir={isAr ? "rtl" : "ltr"}
      className="bg-white border-t border-slate-100 py-10 text-center text-sm font-medium text-slate-700"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/about"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "من نحن" : "About"}
          </Link>
          <Link
            href="/contact"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "التواصل" : "Contact"}
          </Link>
          <Link
            href="/car-care"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "العناية بالسيارات" : "Car care"}
          </Link>
          <Link
            href="/car-air-fresheners"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "معطرات السيارات" : "Air fresheners"}
          </Link>
          <Link
            href="/car-cleaning-products"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "تنظيف السيارات" : "Cleaning products"}
          </Link>
          <Link
            href="/car-accessories"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "إكسسوارات السيارات" : "Accessories"}
          </Link>
          <Link
            href="/car-lighting-tools"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "أدوات وإضاءة" : "Lighting and tools"}
          </Link>
          <Link
            href="/car-tools-equipment"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "أدوات ومعدات" : "Tools and equipment"}
          </Link>
          <Link
            href="/car-fluids-additives"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "سوائل وإضافات" : "Fluids and additives"}
          </Link>
          <Link
            href="/return-policy"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "سياسة الإرجاع والاستبدال" : "Return and exchange policy"}
          </Link>
          <Link
            href="/privacy-policy"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "سياسة الخصوصية" : "Privacy policy"}
          </Link>
          <Link
            href="/terms-of-service"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "شروط الخدمة" : "Terms of service"}
          </Link>
          <Link
            href="/data-deletion"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "حذف البيانات" : "Data deletion"}
          </Link>
          <Link
            href="/shipping"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "الشحن والتوصيل" : "Shipping"}
          </Link>
          <Link
            href="/ordering-guide"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "دليل الطلب" : "Ordering guide"}
          </Link>
          <Link
            href="/faq"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "الأسئلة الشائعة" : "FAQ"}
          </Link>
          <Link
            href="/search-guide"
            prefetch={false}
            className="text-sm tracking-wide text-slate-700 transition hover:text-blue-700"
          >
            {isAr ? "دليل البحث" : "Search guide"}
          </Link>
        </div>

        <div className="my-2 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`tel:${CONTACT_PHONE_E164}`}
            title={CONTACT_PHONE_DISPLAY}
            className="group flex h-11 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-blue-50/30 hover:text-blue-600 hover:shadow-md"
          >
            <Phone
              size={18}
              className="text-slate-400 transition-colors group-hover:text-blue-500"
            />
            <span dir="ltr" className="text-xs font-semibold tracking-wider">
              {CONTACT_PHONE_DISPLAY}
            </span>
          </a>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            title={CONTACT_EMAIL}
            className="group flex h-11 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-blue-50/30 hover:text-blue-600 hover:shadow-md"
          >
            <Mail
              size={18}
              className="text-slate-400 transition-colors group-hover:text-blue-500"
            />
            <span className="text-xs font-semibold">{CONTACT_EMAIL}</span>
          </a>

          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            className="group flex h-11 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-100 hover:bg-emerald-50/30 hover:text-emerald-600 hover:shadow-md"
          >
            <MessageCircle
              size={18}
              className="text-slate-400 transition-colors group-hover:text-emerald-500"
            />
            <span className="text-xs font-semibold">WhatsApp</span>
          </a>
        </div>

        <div className="flex items-center justify-center gap-3.5">
          <a
            href={SOCIAL_PROFILES.facebook}
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook"
            aria-label="Facebook"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-blue-50/50 hover:text-blue-600 hover:shadow-md"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
            </svg>
          </a>

          <a
            href={SOCIAL_PROFILES.instagram}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-rose-100 hover:bg-rose-50/50 hover:text-rose-600 hover:shadow-md"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.022-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 1.802a3.333 3.333 0 110 6.666 3.333 3.333 0 010-6.666zm5.338-3.205a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" clipRule="evenodd" />
            </svg>
          </a>

          <a
            href={SOCIAL_PROFILES.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            title="TikTok"
            aria-label="TikTok"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-800 hover:bg-slate-900 hover:text-white hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 448 512" aria-hidden="true">
              <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31c8.08,0,16,.61,23.71,1.77v67.42a94.13,94.13,0,1,0-23.71,1.48V346.52A162.75,162.75,0,0,0,346.52,509.23C440,509.23,448,421.41,448,349.38V209.91Z" />
            </svg>
          </a>
        </div>

        <div className="space-y-1 text-xs font-semibold text-slate-600">
          <p>
            © {new Date().getFullYear()}{" "}
            {isAr ? "متجر سيزر. جميع الحقوق محفوظة." : "Cesar Store. All rights reserved."}
          </p>
          <p>{creditText}</p>
        </div>
      </div>
    </footer>
  );
}
