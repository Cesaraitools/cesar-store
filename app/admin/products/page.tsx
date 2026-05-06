"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import type { Product } from "@/types/product";
import type { ProductImportJobSnapshot } from "@/types/product-import";
import { getSafeImage } from "@/lib/image-safe";
import { supabase } from "@/lib/supabaseClient";
import { Search, Plus, Trash2, FileUp, Filter, Tag } from "lucide-react";
const PLACEHOLDER_IMAGE = "/placeholder.png";

type PreviewRow = Record<string, any>;
type RowWarning = string[];

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
    failed: { index: number; reason: string }[];
  } | null>(null);
  const [stockFilter, setStockFilter] = useState<
  "all" | "out" | "low" | "in"
>("all");
const [searchQuery, setSearchQuery] = useState("");
const [categoryFilter, setCategoryFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFetchingRef = useRef(false);
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(products.map((product) => product.id));
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm("Delete selected products?")) return;

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
  if (isFetchingRef.current) return;

  isFetchingRef.current = true;

  if (isInitial) {
    setLoading(true);
  } else {
    setIsRefreshing(true);
  }

  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error();
    }

    const data: Product[] = await response.json();
    setProducts(data);
  } catch {
    setError("فشل في تحميل المنتجات");
  } finally {
    setLoading(false);
    setIsRefreshing(false);
    isFetchingRef.current = false;
  }
}

  useEffect(() => {
    fetchProducts(true);

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;

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

  function validateRow(row: PreviewRow): string[] {
    const warnings: string[] = [];

    if (!row.name_ar) warnings.push("Missing name_ar");
    if (!row.name_en) warnings.push("Missing name_en");
    if (!row.description_ar) warnings.push("Missing description_ar");
    if (!row.description_en) warnings.push("Missing description_en");
    if (!row.category) warnings.push("Missing category");
    if (Number.isNaN(Number(row.price)) || Number(row.price) <= 0) {
      warnings.push("Invalid price");
    }
    if (Number.isNaN(Number(row.stock)) || Number(row.stock) < 0) {
      warnings.push("Invalid stock");
    }
    if (!row.images) warnings.push("Missing images");

    return warnings;
  }

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    setIsImporting(true);
    setImportReport(null);
    setImportJob(null);

    try {
      let currentJob = await createImportJob(fileName, previewRows);
      setImportJob(currentJob);

      let delay = 150;
let lastProcessed = 0;

while (
  currentJob.status === "pending" ||
  currentJob.status === "processing"
) {
  currentJob = await processImportJob(currentJob.id);
  setImportJob(currentJob);

  if (
    currentJob.status === "completed" ||
    currentJob.status === "failed"
  ) {
    break;
  }

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
        failed: currentJob.failures.map((failure) => ({
          index: failure.index,
          reason: failure.reason,
        })),
      });
    } catch (importError) {
      console.error("IMPORT JOB FAILED:", importError);

      setImportReport({
        success: 0,
        skipped: 0,
        failed: [
          {
            index: 0,
            reason:
              importError instanceof Error
                ? importError.message
                : "Unknown import error",
          },
        ],
      });
    } finally {
      setIsImporting(false);
      fetchProducts();
    }
  }
  const categories = useMemo(() => {
  return Array.from(
    new Set(products.map((product) => product.category))
  ).sort();
}, [products]);
  const sortedProducts = useMemo(() => {
  return [...products]
  .filter((product) => {
        const matchesSearch =
      product.name.ar
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      product.name.en
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      product.category === categoryFilter;

    if (!matchesSearch || !matchesCategory) {
      return false;
    }
    if (stockFilter === "out") {
      return product.stock <= 0;
    }

    if (stockFilter === "low") {
      return (
        product.stock > 0 &&
        product.stock <= (product.low_stock_threshold ?? 10)
      );
    }

    if (stockFilter === "in") {
      return product.stock > (product.low_stock_threshold ?? 10);
    }

    return true;
  })
  .sort((a, b) => {
    const aOut = a.stock <= 0 ? 1 : 0;
    const bOut = b.stock <= 0 ? 1 : 0;

    if (aOut !== bOut) {
      return bOut - aOut;
    }

    const aLow =
      a.stock > 0 &&
      a.stock <= (a.low_stock_threshold ?? 10)
        ? 1
        : 0;

    const bLow =
      b.stock > 0 &&
      b.stock <= (b.low_stock_threshold ?? 10)
        ? 1
        : 0;

    if (aLow !== bLow) {
      return bLow - aLow;
    }

    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  }); 
},[products, stockFilter, searchQuery, categoryFilter]);
// إحصائيات لوحة المخزون بناءً على البيانات المسترجعة
  const stats = useMemo(() => {
    return {
      total: products.length,
      outOfStock: products.filter(p => p.stock <= 0).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold ?? 10)).length,
      available: products.filter(p => p.stock > 0).length
    };
  }, [products]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">جاري تحميل منتجات متجر سيزر...</p>
    </div>
  );
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المنتجات</h1>
          <p className="text-sm text-gray-500 mt-1">عرض وتحرير كافة المنتجات المتاحة في متجر سيزر</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* زر الحذف الجماعي */}
          <button
            onClick={handleBulkDelete}
            disabled={!selectedIds.length}
            className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-red-50 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            حذف المحدد ({selectedIds.length})
          </button>

          {/* زر استيراد إكسل */}
          <button
            onClick={handleBulkImportClick}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:border-gray-300"
          >
            <FileUp size={16} />
            استيراد Excel
          </button>

          {/* زر إضافة منتج */}
          <Link
            href="/admin/products/add"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-95"
          >
            <Plus size={18} />
            إضافة منتج جديد
          </Link>
        </div>
      </div>

      {/* القسم الرئيسي: الإحصائيات + المنتجات */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* لوحة الإحصائيات الجانبية */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Tag size={16} className="text-blue-600" />
              ملخص المخزون
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {[
                { label: "إجمالي الأصناف", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
                { label: "متاحة للبيع", value: stats.available, color: "text-green-700", bg: "bg-green-50" },
                { label: "مخزون منخفض", value: stats.lowStock, color: "text-orange-700", bg: "bg-orange-50" },
                { label: "نفدت تماماً", value: stats.outOfStock, color: "text-red-700", bg: "bg-red-50" }
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-lg border border-gray-100 ${item.bg} flex flex-col`}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                  <span className={`text-lg font-black mt-1 ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* منطقة البحث والجدول */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="بحث عن منتج..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="relative">
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">جميع التصنيفات</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as any)}
                className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">حالة المخزون (الكل)</option>
                <option value="out">نفذ من المخزن</option>
                <option value="low">مخزون منخفض</option>
                <option value="in">متوفر</option>
              </select>
            </div>
          </div>

          <div className={`overflow-x-auto border rounded-xl bg-white transition-opacity duration-300 relative ${isRefreshing ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
            {isRefreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
                 <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold text-blue-600">جاري تحديث البيانات...</span>
                 </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 w-12 text-center bg-yellow-100">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3">Image</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product) => {
                  const hasEN = product.name.en?.trim();
                  return (
                    <tr key={product.id} className={`border-t ${selectedIds.includes(product.id) ? "bg-red-50" : ""}`}>
                      <td className="p-3 w-12 text-center bg-yellow-50">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                        />
                      </td>
                      <td className="p-3">
                        <img
                          src={getSafeImage(product.images?.[0])}
                          onError={(event) => { (event.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                          className="h-12 w-12 object-contain"
                        />
                      </td>
                      <td className="p-3 font-medium">
                        {product.name.ar}
                        {!hasEN && <span className="ml-2 text-xs bg-yellow-100 px-2 rounded">Missing EN</span>}
                      </td>
                      <td className="p-3">{product.category}</td>
                      <td className="p-3">
                        {product.price} جنيه
                        {product.price === 0 && <span className="ml-2 text-xs bg-yellow-100 px-2 rounded">Price = 0</span>}
                      </td>
                      <td className="p-3">
                        {product.stock <= 0 ? (
                          <span className="bg-red-100 text-red-800 px-2 rounded text-xs">Out ({product.stock})</span>
                        ) : product.stock <= (product.low_stock_threshold ?? 10) ? (
                          <span className="bg-orange-100 text-orange-800 px-2 rounded text-xs">Low Stock ({product.stock})</span>
                        ) : (
                          <span className="bg-green-100 text-green-800 px-2 rounded text-xs">In Stock ({product.stock})</span>
                        )}
                      </td>
                      <td className="p-3">{product.active ? "Active" : "Inactive"}</td>
                      <td className="p-3 flex gap-2">
                        <Link href={`/admin/products/edit/${product.id}`} className="text-xs bg-sky-100 px-3 py-1 rounded">Edit</Link>
                        <button
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product.id)}
                          className="text-xs bg-red-100 px-3 py-1 rounded"
                        >
                          {deletingId === product.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white w-[95%] max-w-6xl rounded">
            <div className="p-4 border-b flex justify-between">
              <div>
                <h2 className="font-semibold">Bulk Import Preview</h2>
                <p className="text-sm text-gray-600">{fileName}</p>
              </div>
              <button onClick={() => setIsPreviewOpen(false)}>Close</button>
            </div>

            <div className="max-h-[60vh] overflow-auto p-4">
              <table className="w-full text-xs border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1">Warnings</th>
                    {previewColumns.map((column) => (
                      <th key={column} className="border p-1">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr
                      key={index}
                      className={rowWarnings[index].length ? "bg-yellow-50" : ""}
                    >
                      <td className="border p-1">
                        {rowWarnings[index].length
                          ? rowWarnings[index].join(", ")
                          : "OK"}
                      </td>
                      {previewColumns.map((column) => (
                        <td key={column} className="border p-1">
                          {String(row[column] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex justify-between">
              <span className="text-sm text-gray-600">
                {importJob
                  ? `Progress: ${importJob.rowsProcessed}/${importJob.rowsTotal}`
                  : "Invalid rows will be skipped"}
              </span>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="bg-black text-white px-4 py-2 rounded"
              >
                {isImporting
                  ? `Importing... ${importJob?.rowsProcessed ?? 0}/${
                      importJob?.rowsTotal ?? previewRows.length
                    }`
                  : "Confirm Import"}
              </button>
            </div>

            {importReport && (
              <div className="p-4 text-sm">
                Imported: {importReport.success} success / {importReport.skipped} skipped /{" "}
                {importReport.failed.length} failed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
