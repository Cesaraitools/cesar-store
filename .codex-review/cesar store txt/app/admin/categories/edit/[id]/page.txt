"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = {
  type: "category";
  id: string;
  image: string;
  category: string;
  en: {
    title: string;
    subtitle: string;
  };
  ar: {
    title: string;
    subtitle: string;
  };
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "",
    category: "",
    image: "", // MUST be URL
    order: 1,
    active: true,
    arTitle: "",
    arSubtitle: "",
    enTitle: "",
    enSubtitle: "",
  });

  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    fetch("/api/categories?admin=true")
      .then((r) => r.json())
      .then((data: Category[]) => {
        const cat = data.find((c) => c.id === id);
        if (!cat) {
          alert("Category not found");
          router.push("/admin/categories");
          return;
        }

        setForm({
          id: cat.id,
          category: cat.category,
          image: cat.image || "",
          order: cat.order,
          active: cat.active,
          arTitle: cat.ar.title,
          arSubtitle: cat.ar.subtitle || "",
          enTitle: cat.en.title,
          enSubtitle: cat.en.subtitle || "",
        });

        setPreview(cat.image || "");
      })
      .catch(() => {
        alert("Failed to load category");
        router.push("/admin/categories");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleBrowseImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview only (blob)
    const blobUrl = URL.createObjectURL(file);
    setPreview(blobUrl);

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "category");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();

      // SAVE URL ONLY
      setForm((prev) => ({
        ...prev,
        image: data.url,
      }));
    } catch (err: any) {
      setUploadError(err.message);
      setForm((prev) => ({ ...prev, image: "" }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.category || !form.arTitle || !form.enTitle) {
      alert("Please fill all required fields");
      return;
    }

    if (!form.image || form.image.startsWith("blob:")) {
      alert("Please upload a valid image before saving");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          category: form.category,
          image: form.image, // URL ONLY
          order: Number(form.order),
          active: form.active,
          ar: {
            title: form.arTitle,
            subtitle: form.arSubtitle,
          },
          en: {
            title: form.enTitle,
            subtitle: form.enSubtitle,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to update category");
        return;
      }

      router.push("/admin/categories");
    } catch {
      alert("Unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10">
        <p className="text-gray-500">Loading category...</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Edit Category</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ID */}
        <div>
          <label className="block text-sm font-medium mb-1">ID</label>
          <input
            value={form.id}
            disabled
            className="w-full rounded border px-3 py-2 bg-gray-100 text-gray-500"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Category Slug *
          </label>
          <input
            name="category"
            value={form.category}
            onChange={updateField}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Category Image *
          </label>

          <div className="flex gap-3">
            <input
              value={form.image}
              disabled
              className="w-full rounded border px-3 py-2 bg-gray-100 text-gray-600"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Browse"}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleBrowseImage}
          />

          {uploadError && (
            <p className="mt-2 text-sm text-red-600">
              {uploadError}
            </p>
          )}

          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="mt-3 h-32 rounded object-cover"
            />
          )}
        </div>

        {/* Arabic */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Arabic Title *
            </label>
            <input
              name="arTitle"
              value={form.arTitle}
              onChange={updateField}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Arabic Subtitle
            </label>
            <input
              name="arSubtitle"
              value={form.arSubtitle}
              onChange={updateField}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        {/* English */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              English Title *
            </label>
            <input
              name="enTitle"
              value={form.enTitle}
              onChange={updateField}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              English Subtitle
            </label>
            <input
              name="enSubtitle"
              value={form.enSubtitle}
              onChange={updateField}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        {/* Meta */}
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Order</label>
            <input
              type="number"
              name="order"
              value={form.order}
              onChange={updateField}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={updateField}
            />
            Active
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded bg-sky-500 px-6 py-2 font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
            className="rounded border px-6 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}