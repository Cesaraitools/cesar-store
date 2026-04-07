"use client";

import { useEffect, useState, useRef } from "react";

type PromoData = {
  id: string;
  position: "categories_side";
  isActive: boolean;

  image: string;

  title: { ar: string; en: string };
  description: { ar: string; en: string };
  cta: { ar: string; en: string; link: string };
};

export default function CategoriesSidePromoAdmin() {
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // UI-only preview
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/promos")
      .then((r) => r.json())
      .then((data: PromoData[]) => {
        const found = data.find(
          (p) => p.position === "categories_side"
        );
        setPromo(found || null);
      });
  }, []);

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    if (!promo) return;
    const { name, value, checked, type } = e.target as HTMLInputElement;

    setPromo({
      ...promo,
      ...(name === "isActive" ? { isActive: checked } : {}),
      title: {
        ...promo.title,
        ...(name === "title_ar" ? { ar: value } : {}),
        ...(name === "title_en" ? { en: value } : {}),
      },
      description: {
        ...promo.description,
        ...(name === "desc_ar" ? { ar: value } : {}),
        ...(name === "desc_en" ? { en: value } : {}),
      },
      cta: {
        ...promo.cta,
        ...(name === "cta_ar" ? { ar: value } : {}),
        ...(name === "cta_en" ? { en: value } : {}),
        ...(name === "cta_link" ? { link: value } : {}),
      },
    });
  }

  async function handleBrowseImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!promo) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    // UI preview only
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "promo");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();

      setPromo({
        ...promo,
        image: data.url, // REAL URL ONLY
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save() {
    if (!promo) return;

    // Hard guard
    if (promo.image.startsWith("blob:")) {
      alert("Invalid image detected. Please re-upload image.");
      return;
    }

    setSaving(true);

    await fetch("/api/promos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promo),
    });

    setSaving(false);
    alert("Saved");
  }

  if (!promo) return <p>Loading...</p>;

  return (
    <main className="p-10 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Categories Side Banner</h1>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Image
        </label>

        <div className="flex gap-3">
          <input
            value={promo.image}
            readOnly
            className="w-full border p-2 rounded bg-gray-50 text-sm"
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

        {(preview || promo.image) && (
          <img
            src={preview || promo.image}
            alt="Preview"
            className="mt-3 h-32 rounded object-cover"
          />
        )}

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Titles */}
      <input
        name="title_en"
        value={promo.title.en}
        onChange={updateField}
        placeholder="Title (EN)"
        className="w-full border p-2 rounded"
      />

      <input
        name="title_ar"
        value={promo.title.ar}
        onChange={updateField}
        placeholder="Title (AR)"
        className="w-full border p-2 rounded"
      />

      {/* Actions */}
      <button
        onClick={save}
        disabled={saving || uploading}
        className="bg-sky-500 text-white px-6 py-2 rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </main>
  );
}