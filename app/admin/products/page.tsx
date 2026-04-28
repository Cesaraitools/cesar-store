"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import type { Product } from "@/types/product";
import type { ProductImportJobSnapshot } from "@/types/product-import";
import { getSafeImage } from "@/lib/image-safe";
import { supabase } from "@/lib/supabaseClient";

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function fetchProducts() {
    setLoading(true);

    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error();

      const data: Product[] = await response.json();
      setProducts(data);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();

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

        await sleep(150);
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

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin – Products</h1>
        <div className="flex gap-3">
          <button
            onClick={handleBulkDelete}
            disabled={!selectedIds.length}
            className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Delete Selected ({selectedIds.length})
          </button>

          <button
            onClick={handleBulkImportClick}
            className="bg-gray-100 px-4 py-2 rounded"
          >
            Bulk Import (Excel)
          </button>

          <Link
            href="/admin/products/add"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Add Product
          </Link>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="overflow-x-auto border rounded bg-white">
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
            {products.map((product) => {
              const hasEN = product.name.en?.trim();

              return (
                <tr
                  key={product.id}
                  className={`border-t ${
                    selectedIds.includes(product.id) ? "bg-red-50" : ""
                  }`}
                >
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
                      onError={(event) => {
                        (event.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                      className="h-12 w-12 object-contain"
                    />
                  </td>
                  <td className="p-3 font-medium">
                    {product.name.ar}
                    {!hasEN && (
                      <span className="ml-2 text-xs bg-yellow-100 px-2 rounded">
                        Missing EN
                      </span>
                    )}
                  </td>
                  <td className="p-3">{product.category}</td>
                  <td className="p-3">
                    {product.price} جنيه
                    {product.price === 0 && (
                      <span className="ml-2 text-xs bg-yellow-100 px-2 rounded">
                        Price = 0
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {product.stock > 0 ? (
                      <span className="bg-green-100 text-green-800 px-2 rounded text-xs">
                        In Stock ({product.stock})
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 rounded text-xs">
                        Out ({product.stock})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {product.active ? "Active" : "Inactive"}
                  </td>
                  <td className="p-3 flex gap-2">
                    <Link
                      href={`/admin/products/edit/${product.id}`}
                      className="text-xs bg-sky-100 px-3 py-1 rounded"
                    >
                      Edit
                    </Link>
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
