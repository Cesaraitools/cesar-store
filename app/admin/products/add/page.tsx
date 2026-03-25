"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";

const PLACEHOLDER_IMAGE = "/placeholder.png";

export default function AddProductPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "",
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    price: "",
    stock: "",
    category: "",
    images: [] as string[],
    active: true,
  });

  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        const activeCategories = data
          .filter((c: { category: string; active: boolean }) => c.active)
          .map((c: { category: string }) => c.category);

        setCategories(activeCategories);
      })
      .catch(() => setError("Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  }

  async function handleBrowseImages(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "product");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const data = await res.json();
        uploadedUrls.push(data.url);
      }

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.category) {
      setError("Category is required");
      return;
    }

    if (form.images.length === 0) {
      setError("Please upload at least one image");
      return;
    }
     console.log("FORM STATE:", form);

      setSaving(true); 
    const cleanImages = form.images.filter(
  (img) => typeof img === "string" && !img.startsWith("blob:")
);

    setSaving(true);

    const now = new Date().toISOString();

    const payload: Product = {
      id: form.id,
      name: {
        ar: form.nameAr.trim(),
        en: form.nameEn.trim(),
      },
      description: {
        ar: form.descriptionAr.trim(),
        en: form.descriptionEn.trim(),
      },
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category,
      images: cleanImages,
      active: form.active,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      window.location.href = "/admin/products";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add Product</h1>
        <Link
          href="/admin/products"
          className="rounded-md border px-4 py-2 text-sm"
        >
          Back
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {uploadError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Category */}
        <div>
          <label className="block text-sm mb-1">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Product ID */}
        <div>
          <label className="block text-sm mb-1">Product ID (numeric)</label>
          <input
            type="text"
            name="id"
            value={form.id}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* Images */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-2">Images</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleBrowseImages}
          />

          {uploading && (
            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {form.images.map((img, index) => (
              <div
                key={index}
                className="relative border rounded p-2 flex flex-col items-center"
              >
                <img
                  src={previews[index] || img || PLACEHOLDER_IMAGE}
                  alt=""
                  className="h-24 object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="mt-2 text-xs text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Name Arabic */}
        <div>
          <label className="block text-sm mb-1">Name (Arabic)</label>
          <input
            type="text"
            name="nameAr"
            value={form.nameAr}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* Name English */}
        <div>
          <label className="block text-sm mb-1">Name (English)</label>
          <input
            type="text"
            name="nameEn"
            value={form.nameEn}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* Description Arabic */}
        <div>
          <label className="block text-sm mb-1">Description (Arabic)</label>
          <textarea
            name="descriptionAr"
            value={form.descriptionAr}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 min-h-[120px]"
          />
        </div>

        {/* Description English */}
        <div>
          <label className="block text-sm mb-1">Description (English)</label>
          <textarea
            name="descriptionEn"
            value={form.descriptionEn}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 min-h-[120px]"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm mb-1">Price</label>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* Stock */}
        <div>
          <label className="block text-sm mb-1">Stock</label>
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* Active */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
          />
          <label className="text-sm">Active</label>
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex justify-end gap-3">
          <Link
            href="/admin/products"
            className="rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-black px-6 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}