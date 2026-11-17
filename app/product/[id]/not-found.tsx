import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-slate-800" dir="rtl">
      <section className="rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-sm sm:p-10">
        <p className="text-sm font-bold text-blue-700">Cesar Store</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          هذا المنتج غير متاح حاليًا
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-8 text-slate-600">
          قد يكون المنتج متوقفًا أو غير متاح للبيع الآن. يمكنك تصفح المنتجات
          والأقسام الحالية للوصول إلى بديل مناسب دون فقدان طريقك داخل المتجر.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white" href="/shop">
            تصفح المنتجات المتاحة
          </Link>
          <Link className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-800" href="/categories">
            تصفح الأقسام
          </Link>
          <Link className="rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-800" href="/search-guide">
            دليل البحث عن المنتجات
          </Link>
        </div>
      </section>
    </main>
  );
}
