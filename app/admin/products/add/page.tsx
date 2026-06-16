"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductVariantsEditor } from "@/components/admin/ProductVariantsEditor";
import type { ProductVariant, ProductVariantOption } from "@/types/product";

export default function AddProductPage() {
  const router = useRouter();
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
    facebookPostId: "",
    facebookPostPermalinkUrl: "",
    images: [] as string[],
    active: true,
    low_stock_threshold: "",
    variantOptions: [] as ProductVariantOption[],
    variants: [] as ProductVariant[],
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
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  // âœ… FIX 1: Ø±Ø¬ÙˆØ¹ Upload Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

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
        console.log("UPLOAD RESPONSE:", data);
        uploadedUrls.push(data.url);
      }

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      setPreviews((prev) => [...prev, ...uploadedUrls]);

    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));

    setPreviews((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const makePrimaryImage = (index: number) => {
    if (index <= 0) return;

    setForm((prev) => {
      const nextImages = [...prev.images];
      const [selectedImage] = nextImages.splice(index, 1);

      if (!selectedImage) {
        return prev;
      }

      nextImages.unshift(selectedImage);

      return {
        ...prev,
        images: nextImages,
      };
    });

    setPreviews((prev) => {
      const nextPreviews = [...prev];
      const [selectedPreview] = nextPreviews.splice(index, 1);

      if (!selectedPreview) {
        return prev;
      }

      nextPreviews.unshift(selectedPreview);
      return nextPreviews;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // âœ… FIX 2: Validation
      if (!form.category) {
        setError("Category is required");
        setSaving(false);
        return;
      }

      // ðŸ›‘ ØªØ£ÙƒØ¯ Ø¥Ù† Ù…ÙÙŠØ´ upload Ø´ØºØ§Ù„
      if (uploading) {
        setError("Please wait until image upload is finished");
        setSaving(false);
        return;
      }

      // ðŸ›‘ ØªØ£ÙƒØ¯ Ø¥Ù† Ø§Ù„ØµÙˆØ± ÙØ¹Ù„Ø§Ù‹ Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø¹Ø¯ upload
      if (!form.images || form.images.length === 0) {
       console.error("NO IMAGES FOUND AT SUBMIT:", form.images);
       setError("Please upload at least one image");
       setSaving(false);
      return;
      }

      const cleanProduct: any = {
        id: form.id?.trim() || crypto.randomUUID(),

        name: {
          ar: form.nameAr,
          en: form.nameEn,
        },

        description: {
          ar: form.descriptionAr,
          en: form.descriptionEn,
        },

        price: parseFloat(form.price) || 0,
        stock: parseInt(form.stock) || 0,
        low_stock_threshold:
  form.low_stock_threshold === ""
    ? 10
    : parseInt(form.low_stock_threshold),
        category: form.category,
        facebookPostId: form.facebookPostId.trim(),
        facebookPostPermalinkUrl: form.facebookPostPermalinkUrl.trim(),
        images: form.images,
        active: form.active,
        variantOptions: form.variantOptions,
        variants: form.variants,
      };

      // âœ… FIX 3: Debug
      console.log("SENDING:", cleanProduct);

      const res = await fetch("/api/products", {
  method: "POST",
  credentials: "include", // ðŸ”¥ Ø£Ù‡Ù… Ø³Ø·Ø± ÙÙŠ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙƒÙ„Ù‡ Ø­Ø§Ù„ÙŠØ§Ù‹
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(cleanProduct),
});

      // ðŸ”¥ ØªØ£ÙƒØ¯ Ø¥Ù† Ø§Ù„Ø·Ù„Ø¨ Ø®Ø±Ø¬ ÙØ¹Ù„Ø§Ù‹
      if (!res) {
      throw new Error("Request failed to send");
    }

      // ðŸ”¥ Ø§Ø³ØªÙ†Ù‰ Ø§Ù„Ø±Ø¯
      const result = await res.json();

     // ðŸ”¥ Ù„Ùˆ ÙØ´Ù„
     if (!res.ok) {
     console.error("API ERROR:", result);
     throw new Error(result.error || "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ù…Ù†ØªØ¬");
    }

     // ðŸ”¥ Ø£Ù‡Ù… Ø®Ø·ÙˆØ©: ØªØ­Ù‚Ù‚ Ù‚Ø¨Ù„ navigation
    console.log("SUCCESS ADD:", result);

   // ðŸ”¥ delay Ø¨Ø³ÙŠØ· Ù„Ø¶Ù…Ø§Ù† Ø§Ù„ÙƒØªØ§Ø¨Ø© ÙÙŠ DB
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Ø¨Ø¹Ø¯ ÙƒØ¯Ù‡ Ø¨Ø³
   router.push("/admin/products");
     router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm mb-1 font-bold">ÙƒÙˆØ¯ Ø§Ù„Ù…Ù†ØªØ¬ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</label>
          <input
            type="text"
            name="id"
            value={form.id}
            onChange={handleChange}
            placeholder="Ù…Ø«Ø§Ù„: CAR-123"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-bold">Ø§Ù„Ù‚Ø³Ù…</label>
          <select
            name="category"
            required
            value={form.category}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù…</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 font-bold">Facebook Post ID</label>
          <input
            type="text"
            name="facebookPostId"
            value={form.facebookPostId}
            onChange={handleChange}
            placeholder="مثال: 122195738..."
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">
            Facebook Post Permalink URL
          </label>
          <input
            type="url"
            name="facebookPostPermalinkUrl"
            value={form.facebookPostPermalinkUrl}
            onChange={handleChange}
            placeholder="https://www.facebook.com/..."
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-bold">Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬ (Ø¹Ø±Ø¨ÙŠ)</label>
          <input
            type="text"
            name="nameAr"
            required
            value={form.nameAr}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-bold">Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬ (Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)</label>
          <input
            type="text"
            name="nameEn"
            required
            value={form.nameEn}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">Ø§Ù„ÙˆØµÙ (Ø¹Ø±Ø¨ÙŠ)</label>
          <textarea
            name="descriptionAr"
            rows={3}
            value={form.descriptionAr}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">Ø§Ù„ÙˆØµÙ (Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)</label>
          <textarea
            name="descriptionEn"
            rows={3}
            value={form.descriptionEn}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-bold">Ø§Ù„Ø³Ø¹Ø±</label>
          <input
            type="number"
            name="price"
            required
            value={form.price}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-bold">Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…ØªÙˆÙØ±Ø©</label>
          <input
            type="number"
            name="stock"
            required
            value={form.stock}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
  <label className="block text-sm mb-1 font-bold">
    Ø­Ø¯ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡ (Low Stock)
  </label>
  <input
    type="number"
    name="low_stock_threshold"
    value={form.low_stock_threshold}
    onChange={handleChange}
    placeholder="Ù…Ø«Ù„Ø§Ù‹ 10"
    className="w-full rounded border px-3 py-2"
  />
</div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">ØµÙˆØ± Ø§Ù„Ù…Ù†ØªØ¬</label>
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-wrap gap-3 mb-3">
            {previews.map((src, i) => (
              <div key={`${src}-${i}`} className="relative">
                <button
                  type="button"
                  onClick={() => makePrimaryImage(i)}
                  className={`overflow-hidden rounded border-2 ${
                    i === 0 ? "border-black" : "border-gray-200"
                  }`}
                  title={i === 0 ? "Main image" : "Set as main image"}
                >
                  <img src={src} alt="" className="w-20 h-20 object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-black text-xs text-white"
                  aria-label="Remove image"
                >
                  x
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed flex items-center justify-center rounded hover:bg-gray-50"
            >
              {uploading ? "..." : "+"}
            </button>
          </div>
          {previews.length > 0 && (
            <p className="mb-2 text-xs text-gray-500">
              Ø£ÙˆÙ„ ØµÙˆØ±Ø© Ø³ØªØ¸Ù‡Ø± ÙƒØµÙˆØ±Ø© Ø±Ø¦ÙŠØ³ÙŠØ© ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±. Ø§Ø¶ØºØ· Ø¹Ù„Ù‰ Ø£ÙŠ ØµÙˆØ±Ø© Ù„Ø¬Ø¹Ù„Ù‡Ø§ Ø§Ù„Ø£ÙˆÙ„Ù‰.
            </p>
          )}
          {uploadError && <p className="text-red-500 text-xs font-bold">{uploadError}</p>}
        </div>

        <ProductVariantsEditor
          options={form.variantOptions}
          variants={form.variants}
          onChange={({ options, variants }) =>
            setForm((prev) => ({
              ...prev,
              variantOptions: options,
              variants,
            }))
          }
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            id="active"
            checked={form.active}
            onChange={handleChange}
          />
          <label htmlFor="active" className="text-sm font-bold">ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬ ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±</label>
        </div>

        {error && <div className="md:col-span-2 text-red-500 text-sm font-bold bg-red-50 p-3 rounded">{error}</div>}

        <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
          <Link
            href="/admin/products"
            className="rounded-md border px-6 py-2 text-sm font-bold hover:bg-gray-50"
          >
            Ø¥Ù„ØºØ§Ø¡
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-md bg-black px-8 py-2 text-sm font-bold text-white disabled:opacity-50 shadow-sm"
          >
            {saving ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸ Ø§Ù„Ù…Ù†ØªØ¬"}
          </button>
        </div>
      </form>
    </div>
  );
}
