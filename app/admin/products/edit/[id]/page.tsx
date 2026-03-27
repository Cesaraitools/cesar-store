"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";
import { normalizeCategory } from "@/lib/category-normalizer";

type Category = {
  category: string;
  active: boolean;
};

type Props = {
  params: { id: string };
};

export default function EditProductPage({ params }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    images: [] as string[], // URLs ONLY
    active: true,
  });

  // Preview blobs (UI only)
  const [previews, setPreviews] = useState<string[]>([]);

  /* ---------------- Load Product + Categories ---------------- */

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([products, categoriesData]) => {
        const normalizedParamId = params.id.toLowerCase();

        const product = products.find(
          (p: Product) => p.id.toLowerCase() === normalizedParamId
        );

        if (!product) {
          throw new Error("Product not found");
        }

        setForm({
  id: product.id,
  nameAr: product.name.ar,
  nameEn: product.name.en,
  descriptionAr: product.description.ar,
  descriptionEn: product.description.en,
  price: String(product.price),
  stock: String(product.stock),
  category: normalizeCategory(product.category), // ✅ FIX
  images: product.images || [],
  active: product.active,
});

        const activeCategories = categoriesData
          .filter((c: Category) => c.active)
          .map((c: Category) => c.category);

        setCategories(activeCategories);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load product data");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  /* ---------------- Handlers ---------------- */

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

    // UI previews only (blob)
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

      // SAVE URLs ONLY (never blob)
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Hard guard: no blob allowed
    // 🟢 Remove any accidental blob URLs (safety fix)
     const cleanImages = form.images.filter((img) => !img.startsWith("blob:"));

      if (cleanImages.length === 0) {
       alert("Please upload at least one valid image.");
        return;
       }

    setSaving(true);

    const payload: Partial<Product> & { id: string } = {
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
    };

    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update product");
      }

      router.push("/admin/products");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = confirm(
      "Are you sure you want to delete this product?\nThis action cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      router.push("/admin/products");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------- States ---------------- */

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">Loading product...</p>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* -------- Left Column -------- */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Product ID
            </label>
            <input
              value={form.id}
              readOnly
              className="w-full rounded-md border p-2 bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Name (Arabic)
            </label>
            <input
              name="nameAr"
              value={form.nameAr}
              onChange={handleChange}
              required
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Name (English)
            </label>
            <input
              name="nameEn"
              value={form.nameEn}
              onChange={handleChange}
              required
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Price
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Stock
            </label>
            <input
              type="number"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            Active
          </label>
        </div>

        {/* -------- Right Column -------- */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full rounded-md border p-2"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Images
            </label>

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Browse"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleBrowseImages}
            />

            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}

            {/* Thumbnails */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {form.images.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  className="relative border rounded-md overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`img-${idx}`}
                    className="h-24 w-full object-contain bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 rounded bg-black/70 px-1 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (Arabic)
            </label>
            <textarea
              name="descriptionAr"
              value={form.descriptionAr}
              onChange={handleChange}
              required
              rows={4}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (English)
            </label>
            <textarea
              name="descriptionEn"
              value={form.descriptionEn}
              onChange={handleChange}
              required
              rows={4}
              className="w-full rounded-md border p-2"
            />
          </div>
        </div>

        {/* -------- Actions -------- */}
        <div className="md:col-span-2 flex justify-between pt-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-md bg-black px-6 py-2 text-sm text-white"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="rounded-md border px-6 py-2 text-sm"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 px-6 py-2 text-sm text-white"
          >
            {deleting ? "Deleting..." : "Delete Product"}
          </button>
        </div>
      </form>
    </div>
  );
}