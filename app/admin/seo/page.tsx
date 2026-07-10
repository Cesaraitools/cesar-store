import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, ExternalLink, ImageIcon, SearchCheck } from "lucide-react";

import { getActiveProducts } from "@/lib/server/catalog";
import { getCategorySeo } from "@/lib/seo";
import { getSafeImage } from "@/lib/image-safe";
import type { Product } from "@/types/product";
import IndexNowSubmitButton from "./IndexNowSubmitButton";

export const dynamic = "force-dynamic";

type SeoIssue = {
  code: string;
  label: string;
  severity: "high" | "medium" | "low";
};

type SeoAuditRow = {
  product: Product;
  imageCount: number;
  descriptionLength: number;
  issues: SeoIssue[];
};

function textLength(value?: string) {
  return String(value || "").replace(/\s+/g, " ").trim().length;
}

function auditProduct(product: Product): SeoAuditRow {
  const descriptionLength = Math.max(
    textLength(product.description.ar),
    textLength(product.description.en)
  );
  const imageCount = product.images.filter(Boolean).length;
  const firstImage = getSafeImage(product.images[0]);
  const categorySeo = getCategorySeo(product.category);
  const issues: SeoIssue[] = [];

  if (descriptionLength < 80) {
    issues.push({
      code: "short-description",
      label: "الوصف قصير أو غير كاف",
      severity: "high",
    });
  }

  if (imageCount < 2) {
    issues.push({
      code: "single-image",
      label: "الصنف يحتاج أكثر من صورة",
      severity: "high",
    });
  }

  if (!firstImage || firstImage.includes("placeholder")) {
    issues.push({
      code: "placeholder-image",
      label: "الصورة الرئيسية غير مناسبة",
      severity: "high",
    });
  }

  if (!Number.isFinite(product.price) || product.price <= 0) {
    issues.push({
      code: "missing-price",
      label: "السعر غير مكتمل",
      severity: "medium",
    });
  }

  if (!Number.isFinite(product.stock) || product.stock <= 0) {
    issues.push({
      code: "missing-stock",
      label: "المخزون غير متاح",
      severity: "medium",
    });
  }

  if (!categorySeo) {
    issues.push({
      code: "unknown-category",
      label: "التصنيف غير مربوط بخريطة SEO",
      severity: "low",
    });
  }

  return {
    product,
    imageCount,
    descriptionLength,
    issues,
  };
}

function severityRank(issue: SeoIssue) {
  if (issue.severity === "high") return 3;
  if (issue.severity === "medium") return 2;
  return 1;
}

function issueClass(issue: SeoIssue) {
  if (issue.severity === "high") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (issue.severity === "medium") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function AdminSeoAuditPage() {
  const products = await getActiveProducts(1000);
  const rows = products
    .map(auditProduct)
    .sort((a, b) => {
      const aRank = Math.max(0, ...a.issues.map(severityRank));
      const bRank = Math.max(0, ...b.issues.map(severityRank));

      if (aRank !== bRank) return bRank - aRank;
      if (a.issues.length !== b.issues.length) return b.issues.length - a.issues.length;

      return a.product.name.ar.localeCompare(b.product.name.ar, "ar");
    });
  const issueRows = rows.filter((row) => row.issues.length > 0);
  const singleImageCount = rows.filter((row) =>
    row.issues.some((issue) => issue.code === "single-image")
  ).length;
  const shortDescriptionCount = rows.filter((row) =>
    row.issues.some((issue) => issue.code === "short-description")
  ).length;
  const readyCount = rows.length - issueRows.length;

  return (
    <div className="space-y-8" dir="rtl">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-blue-700">
            <SearchCheck className="h-5 w-5" />
            SEO / AIO Product Audit
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            تقرير ظهور المنتجات
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
            يعرض المنتجات التي تحتاج تحسينات مباشرة لزيادة فرص الظهور في
            Google Merchant Center ومحركات البحث ومحركات إجابات الذكاء الاصطناعي.
          </p>
        </div>
        <Link
          href="/google-products.tsv"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          dir="ltr"
        >
          <ExternalLink className="h-4 w-4" />
          google-products.tsv
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black text-slate-400">كل المنتجات النشطة</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black text-emerald-700">جاهزة مبدئيًا</p>
          <p className="mt-2 text-3xl font-black text-emerald-800">{readyCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-black text-rose-700">تحتاج صور إضافية</p>
          <p className="mt-2 text-3xl font-black text-rose-800">{singleImageCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black text-amber-700">أوصاف قصيرة</p>
          <p className="mt-2 text-3xl font-black text-amber-800">
            {shortDescriptionCount}
          </p>
        </div>
      </section>

      <IndexNowSubmitButton />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black text-slate-950">
            المنتجات التي تحتاج مراجعة
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            ابدأ بالمنتجات ذات العلامات الحمراء لأنها الأقرب لتوصيات Merchant Center.
          </p>
        </div>

        {issueRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <p className="text-lg font-black text-slate-900">
              لا توجد مشاكل SEO أساسية في المنتجات النشطة.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {issueRows.map((row) => {
              const productName = row.product.name.ar || row.product.name.en || row.product.id;

              return (
                <article
                  key={row.product.id}
                  className="grid gap-4 p-5 lg:grid-cols-[96px_1fr_auto]"
                >
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                    {row.product.images[0] ? (
                      <Image
                        alt={productName}
                        className="h-full w-full object-contain"
                        height={96}
                        src={getSafeImage(row.product.images[0])}
                        width={96}
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {productName}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-400" dir="ltr">
                        {row.product.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {row.issues.map((issue) => (
                        <span
                          key={issue.code}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${issueClass(issue)}`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {issue.label}
                        </span>
                      ))}
                    </div>

                    <div className="grid gap-2 text-sm font-bold text-slate-600 md:grid-cols-4">
                      <span>الصور: {row.imageCount}</span>
                      <span>الوصف: {row.descriptionLength} حرف</span>
                      <span>السعر: {row.product.price} EGP</span>
                      <span>المخزون: {row.product.stock}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:min-w-40">
                    <Link
                      className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
                      href={`/admin/products/edit/${row.product.id}`}
                    >
                      تعديل المنتج
                    </Link>
                    <Link
                      className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
                      href={`/product/${row.product.id}`}
                      target="_blank"
                    >
                      عرض المنتج
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
