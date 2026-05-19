"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import type { Product } from "@/types/product";
import type { ProductImportJobSnapshot } from "@/types/product-import";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { getSafeImage } from "@/lib/image-safe";
import { supabase } from "@/lib/supabaseClient";
import { Search, Plus, Trash2, FileUp, FileDown, Filter, Tag, LayoutGrid } from "lucide-react";

const PLACEHOLDER_IMAGE = "/placeholder.png";

type PreviewRow = Record<string, any>;
type RowWarning = string[];

const PRODUCT_EXPORT_COLUMNS = [
  "name_ar",
  "name_en",
  "description_ar",
  "description_en",
  "price",
  "stock",
  "category",
  "images",
  "badge",
  "active",
];

const PRODUCT_EXPORT_COLUMN_WIDTHS = [
  { wch: 34 },
  { wch: 34 },
  { wch: 46 },
  { wch: 46 },
  { wch: 12 },
  { wch: 12 },
  { wch: 22 },
  { wch: 70 },
  { wch: 14 },
  { wch: 12 },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createImportJob(fileName: string, rows: PreviewRow[]) {
  const response = await fetch("/api/admin/products/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, rows }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.details ||
        payload?.error ||
        `Failed to create import job (${response.status})`
    );
  }

  return payload.job as ProductImportJobSnapshot;
}

async function processImportJob(jobId: string) {
  const response = await fetch(`/api/admin/products/import/${jobId}`, {
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.details ||
        payload?.error ||
        `Failed to process import job (${response.status})`
    );
  }

  return payload.job as ProductImportJobSnapshot;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowWarnings, setRowWarnings] = useState<RowWarning[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importJob, setImportJob] = useState<ProductImportJobSnapshot | null>(null);
  const [importReport, setImportReport] = useState<{
    success: number;
    skipped: number;
    failed: { index: number; name: string; reason: string }[];
  } | null>(null);
  
  const [stockFilter, setStockFilter] = useState<"all" | "out" | "low" | "in">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === sortedProducts.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(sortedProducts.map((product) => product.id));
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} منتج؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    try {
      for (const id of selectedIds) {
        await fetch("/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }

      setProducts((prev) => prev.filter((product) => !selectedIds.includes(product.id)));
      setSelectedIds([]);
    } catch (deleteError) {
      console.error("Bulk delete failed", deleteError);
    }
  }

  async function fetchProducts(isInitial = false) {
    if (isFetchingRef.current) {
  pendingRefreshRef.current = true;
  return;
}
    isFetchingRef.current = true;

    if (isInitial) setLoading(true);
    else setIsRefreshing(true);

    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error();
      const data: Product[] = await response.json();
      setProducts(data);
    } catch {
      setError("فشل في تحميل منتجات متجر سيزر");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
      if (pendingRefreshRef.current) {
  pendingRefreshRef.current = false;
  fetchProducts();
}
    }
  }

  useEffect(() => {
    fetchProducts(true);

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => { fetchProducts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("هل تريد بالتأكيد حذف هذا المنتج؟")) return;

    try {
      setDeletingId(id);
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error();
      setProducts((prev) => prev.filter((product) => product.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleBulkImportClick() {
    fileInputRef.current?.click();
  }

  function handleExportProducts() {
    const rows = products.map((product) => ({
      name_ar: product.name.ar,
      name_en: product.name.en,
      description_ar: product.description.ar,
      description_en: product.description.en,
      price: product.price,
      stock: product.stock,
      category: product.category,
      images: product.images.join("; "),
      badge: product.badge || "",
      active: product.active,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: PRODUCT_EXPORT_COLUMNS,
    });
    worksheet["!cols"] = PRODUCT_EXPORT_COLUMN_WIDTHS;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "products");

    const exportedAt = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `cesar-products-${exportedAt}.xlsx`, {
      compression: true,
    });
  }

  function validateRow(row: PreviewRow): string[] {
    const warnings: string[] = [];
    if (!row.name_ar) warnings.push("اسم (عربي) مفقود");
    if (!row.category) warnings.push("التصنيف مفقود");
    if (Number.isNaN(Number(row.price)) || Number(row.price) <= 0) warnings.push("سعر غير صالح");
    if (Number.isNaN(Number(row.stock)) || Number(row.stock) < 0) warnings.push("مخزون غير صالح");
    if (!normalizeImagesArray(row.images).length) warnings.push("مسار صورة غير صالح أو مفقود");
    return warnings;
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportReport(null);
    setImportJob(null);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: PreviewRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    setPreviewRows(json);
    setPreviewColumns(json.length ? Object.keys(json[0]) : []);
    setRowWarnings(json.map(validateRow));
    setIsPreviewOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmImport() {
    setIsImporting(true);
    setImportReport(null);
    try {
      let currentJob = await createImportJob(fileName, previewRows);
      setImportJob(currentJob);

      let delay = 150;
      let lastProcessed = 0;

      while (currentJob.status === "pending" || currentJob.status === "processing") {
        currentJob = await processImportJob(currentJob.id);
        setImportJob(currentJob);
        if (currentJob.status === "completed" || currentJob.status === "failed") break;
        await sleep(delay);
        if (currentJob.rowsProcessed > lastProcessed) {
          delay = 150;
          lastProcessed = currentJob.rowsProcessed;
        } else {
          delay = Math.min(delay + 150, 2000);
        }
      }

      setImportReport({
        success: currentJob.rowsSuccess,
        skipped: currentJob.rowsSkipped,
        failed: currentJob.failures.map((f) => ({
          index: f.index,
          name: f.name,
          reason: f.reason,
        })),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(false);
      fetchProducts();
    }
  }

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).sort();
  }, [products]);

  const sortedProducts = useMemo(() => {
    return [...products]
      .filter((product) => {
        const matchesSearch = product.name.ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (product.name.en?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
        
        let matchesStock = true;
        if (stockFilter === "out") matchesStock = product.stock <= 0;
        else if (stockFilter === "low") matchesStock = product.stock > 0 && product.stock <= (product.low_stock_threshold ?? 10);
        else if (stockFilter === "in") matchesStock = product.stock > (product.low_stock_threshold ?? 10);

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        // ترتيب المنتجات: نافذ المخزون أولاً ثم المنخفض ثم الأحدث
        const aStatus = a.stock <= 0 ? 2 : a.stock <= (a.low_stock_threshold ?? 10) ? 1 : 0;
        const bStatus = b.stock <= 0 ? 2 : b.stock <= (b.low_stock_threshold ?? 10) ? 1 : 0;
        if (aStatus !== bStatus) return bStatus - aStatus;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, stockFilter, searchQuery, categoryFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    outOfStock: products.filter(p => p.stock <= 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold ?? 10)).length,
    available: products.filter(p => p.stock > 0).length
  }), [products]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">جاري تحميل منتجات متجر سيزر...</p>
    </div>
  );

  if (error) return <div className="p-6 text-red-600 font-bold text-center">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المنتجات</h1>
          <p className="text-sm text-gray-500 mt-1">التحكم في مخزون وأسعار منتجات متجر سيزر</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={handleBulkDelete}
            disabled={!selectedIds.length}
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-red-600 hover:text-white disabled:opacity-30"
          >
            <Trash2 size={18} />
            حذف ({selectedIds.length})
          </button>

          <button
            onClick={handleBulkImportClick}
            className="flex items-center gap-2 bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-gray-100"
          >
            <FileUp size={18} />
            استيراد Excel
          </button>

          <button
            onClick={handleExportProducts}
            disabled={!products.length}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-emerald-100 disabled:opacity-30"
          >
            <FileDown size={18} />
            {"\u062a\u0635\u062f\u064a\u0631 Excel"}
          </button>

          <Link
            href="/admin/products/add"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
          >
            <Plus size={20} />
            إضافة منتج
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Statistics Bar */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {[
    {
      label: "إجمالي المنتجات",
      value: stats.total,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "متوفر حالياً",
      value: stats.available,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: "مخزون منخفض",
      value: stats.lowStock,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      label: "غير متوفر",
      value: stats.outOfStock,
      color: "text-red-700",
      bg: "bg-red-50",
    },
  ].map((item, i) => (
    <div
      key={i}
      className={`${item.bg} border border-gray-100 rounded-2xl p-5 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-500">
          {item.label}
        </span>

        <LayoutGrid size={18} className="text-gray-400" />
      </div>

      <div className={`text-3xl font-black ${item.color}`}>
        {item.value}
      </div>
    </div>
  ))}
</div>

        {/* Main Content Area */}
         <div className="w-full">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="ابحث باسم المنتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>

            <div className="relative">
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="all">كل التصنيفات</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="all">كل حالات المخزون</option>
                <option value="out">المنتهي</option>
                <option value="low">المنخفض</option>
                <option value="in">المتوفر بكثرة</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden relative transition-opacity ${isRefreshing ? "opacity-50" : "opacity-100"}`}>
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === sortedProducts.length && sortedProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-4 font-bold text-gray-600">المنتج</th>
                  <th className="p-4 font-bold text-gray-600">التصنيف</th>
                  <th className="p-4 font-bold text-gray-600">السعر</th>
                  <th className="p-4 font-bold text-gray-600">المخزون</th>
                  <th className="p-4 font-bold text-gray-600">الحالة</th>
                  <th className="p-4 font-bold text-gray-600 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-blue-50/30 transition-colors ${selectedIds.includes(product.id) ? "bg-blue-50" : ""}`}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getSafeImage(product.images?.[0])}
                          alt={product.name.ar}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-100"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                        />
                        <div>
                          <p className="font-bold text-gray-900">{product.name.ar}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{product.name.en || "لا يوجد اسم إنجليزي"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{product.category}</td>
                    <td className="p-4">
                      <span className="font-black text-blue-700">{product.price} ج.م</span>
                    </td>
                    <td className="p-4">
                      {product.stock <= 0 ? (
                        <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-bold">منتهي</span>
                      ) : product.stock <= (product.low_stock_threshold ?? 10) ? (
                        <span className="px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 text-xs font-bold">منخفض ({product.stock})</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold">{product.stock} قطعة</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className={`w-2 h-2 rounded-full mx-auto ${product.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300"}`} title={product.active ? "نشط" : "غير نشط"}></div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Link
                          href={`/admin/products/edit/${product.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Plus size={18} className="rotate-45" /> {/* رمز تعديل بديل للمثال */}
                        </Link>
                        <button
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-30"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedProducts.length === 0 && (
              <div className="p-20 text-center text-gray-400">
                <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                <p>لا توجد منتجات تطابق معايير البحث</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-black text-gray-900">معاينة استيراد البيانات</h2>
                <p className="text-sm text-gray-500">الملف: {fileName}</p>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                إغلاق
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr>
                    <th className="border p-3 bg-gray-100 font-bold">التنبيهات</th>
                    {previewColumns.map((col) => (
                      <th key={col} className="border p-3 bg-gray-100 font-bold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className={rowWarnings[idx].length ? "bg-red-50/50" : "hover:bg-gray-50"}>
                      <td className="border p-3 font-bold text-red-600">
                        {rowWarnings[idx].length ? rowWarnings[idx].join(" | ") : "جاهز"}
                      </td>
                      {previewColumns.map((col) => (
                        <td key={col} className="border p-3 text-gray-600">{String(row[col] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm">
                {importJob ? (
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300" 
                        style={{ width: `${(importJob.rowsProcessed / importJob.rowsTotal) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-blue-700">معالجة: {importJob.rowsProcessed} / {importJob.rowsTotal}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 font-medium">* سيتم تجاهل الصفوف التي تحتوي على أخطاء قاتلة تلقائياً.</span>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-white transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                >
                  {isImporting ? "جاري الاستيراد..." : "تأكيد واستيراد"}
                </button>
              </div>
            </div>

            {importReport && (
              <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 space-y-3">
                <p className="text-sm font-bold text-blue-800 text-center">
                  النتيجة: {importReport.success} ناجح | {importReport.skipped} تم تخطيه | {importReport.failed.length} فشل
                </p>
                {!!importReport.failed.length && (
                  <div className="max-h-48 overflow-auto rounded-xl border border-red-100 bg-white/80 p-3 text-right">
                    <div className="space-y-2 text-xs">
                      {importReport.failed.map((failure) => (
                        <div key={`${failure.index}-${failure.name}`} className="rounded-lg border border-red-100 bg-red-50/60 p-2">
                          <div className="font-bold text-red-700">
                            {failure.name || `الصف ${failure.index}`}
                          </div>
                          <div className="text-gray-600">
                            الصف {failure.index} | {failure.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
