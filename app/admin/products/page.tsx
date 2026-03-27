"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import * as XLSX from "xlsx";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { getSafeImage } from "@/lib/image-safe";
import { normalizeCategory } from "@/lib/category-normalizer";
const PLACEHOLDER_IMAGE = "/placeholder.png";

type PreviewRow = Record<string, any>;
type RowWarning = string[];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const [rowWarnings, setRowWarnings] = useState<RowWarning[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<{
    success: number;
    failed: { index: number; reason: string }[];
  } | null>(null);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error();
      const data: Product[] = await res.json();
      setProducts(data);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      setDeletingId(id);
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleBulkImportClick() {
    fileInputRef.current?.click();
  }

  function validateRow(row: PreviewRow): string[] {
    const w: string[] = [];
    if (!row.name_ar) w.push("Missing name_ar");
    if (!row.name_en) w.push("Missing name_en");
    if (!row.description_ar) w.push("Missing description_ar");
    if (!row.description_en) w.push("Missing description_en");
    if (!row.category) w.push("Missing category");
    if (isNaN(Number(row.price)) || Number(row.price) <= 0)
      w.push("Invalid price");
    if (isNaN(Number(row.stock)) || Number(row.stock) < 0)
      w.push("Invalid stock");
    if (!row.images) w.push("Missing images");
    return w;
  }

  async function handleFileSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportReport(null);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: PreviewRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    setPreviewRows(json);
    setPreviewColumns(json.length ? Object.keys(json[0]) : []);
    setRowWarnings(json.map(validateRow));
    setIsPreviewOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmImport() {
    setIsImporting(true);
    const report = { success: 0, failed: [] as any[] };

    for (let i = 0; i < previewRows.length; i++) {
      if (rowWarnings[i].length) continue;

      const r = previewRows[i];

      const images = normalizeImagesArray(r.images);

      const payload: Product = {
        id: crypto.randomUUID(),
        name: {
          ar: String(r.name_ar).trim(),
          en: String(r.name_en).trim(),
        },
        description: {
          ar: String(r.description_ar).trim(),
          en: String(r.description_en).trim(),
        },
        price: Number(r.price),
        category: normalizeCategory(r.category),
        images,
        stock: Number(r.stock) || 0,
        active:
          r.active === true ||
          r.active === "TRUE" ||
          r.active === "true",
        createdAt: "",
        updatedAt: "",
      };

      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "API error");
        }

        report.success++;
      } catch (e: any) {
        report.failed.push({
          index: i + 1,
          reason: e.message,
        });
      }
    }

    setImportReport(report);
    setIsImporting(false);
    fetchProducts();
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin – Products</h1>
        <div className="flex gap-3">
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
            {products.map((p) => {
              const hasEN = p.name.en?.trim();
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <img
                      src={getSafeImage(p.images?.[0])}
                      className="h-12 w-12 object-contain"
                    />
                  </td>
                  <td className="p-3 font-medium">
                    {p.name.ar}
                    {!hasEN && (
                      <span className="ml-2 text-xs bg-yellow-100 px-2 rounded">
                        Missing EN
                      </span>
                    )}
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">
                    {p.price} جنيه
                    {p.price === 0 && (
                      <span className="ml-2 text-xs bg-yellow-100 px-2 rounded">
                        Price = 0
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {p.stock > 0 ? (
                      <span className="bg-green-100 text-green-800 px-2 rounded text-xs">
                        In Stock ({p.stock})
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 rounded text-xs">
                        Out ({p.stock})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {p.active ? "Active" : "Inactive"}
                  </td>
                  <td className="p-3 flex gap-2">
                    <Link
                      href={`/admin/products/edit/${p.id}`}
                      className="text-xs bg-sky-100 px-3 py-1 rounded"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs bg-red-100 px-3 py-1 rounded"
                    >
                      Delete
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
              <button onClick={() => setIsPreviewOpen(false)}>
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto p-4">
              <table className="w-full text-xs border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1">Warnings</th>
                    {previewColumns.map((c) => (
                      <th key={c} className="border p-1">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr
                      key={i}
                      className={rowWarnings[i].length ? "bg-yellow-50" : ""}
                    >
                      <td className="border p-1">
                        {rowWarnings[i].length
                          ? rowWarnings[i].join(", ")
                          : "OK"}
                      </td>
                      {previewColumns.map((c) => (
                        <td key={c} className="border p-1">
                          {String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex justify-between">
              <span className="text-sm text-gray-600">
                Invalid rows will be skipped
              </span>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="bg-black text-white px-4 py-2 rounded"
              >
                {isImporting ? "Importing..." : "Confirm Import"}
              </button>
            </div>

            {importReport && (
              <div className="p-4 text-sm">
                Imported: {importReport.success} success /{" "}
                {importReport.failed.length} failed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}