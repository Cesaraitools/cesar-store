"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";

const PLACEHOLDER_IMAGE = "/placeholder.png";

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
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  /**
   * تم تعديل هذه الدالة لتتوافق مع كود الـ API (صورة 1)
   * المسمى أصبح "file" بدلاً من "files" وتم إضافة حقل "type"
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]); 
        formData.append("type", "product"); 

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.details || "فشل رفع إحدى الصور");
        }

        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      setPreviews((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * تم تعديل هذه الدالة لتتوافق مع كود الـ API (صورة 5)
   * يتم إرسال المنتج داخل مصفوفة [cleanProduct] لأن الـ API يستخدم insert مباشرة
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // تطهير البيانات لضمان عدم إرسال حقول زائدة تسبب خطأ 400
      const cleanProduct: any = {
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        descriptionAr: form.descriptionAr,
        descriptionEn: form.descriptionEn,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        category: form.category,
        images: form.images,
        active: form.active,
      };

      if (form.id.trim()) {
        cleanProduct.id = form.id.trim();
      }

      // إرسال المصفوفة كما يتوقع الـ API
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([cleanProduct]), 
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "حدث خطأ أثناء حفظ المنتج");
      }

      router.push("/admin/products");
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // المظهر الخارجي (UI) تم الحفاظ عليه بنسبة 100% كما في ملفك الأصلي
  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">إضافة منتج جديد</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow">
        {/* كود المنتج */}
        <div>
          <label className="block text-sm mb-1 font-bold">كود المنتج (اختياري)</label>
          <input
            type="text"
            name="id"
            value={form.id}
            onChange={handleChange}
            placeholder="مثال: CAR-123"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* القسم */}
        <div>
          <label className="block text-sm mb-1 font-bold">القسم</label>
          <select
            name="category"
            required
            value={form.category}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">اختر القسم</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* الاسم بالعربي */}
        <div>
          <label className="block text-sm mb-1 font-bold">اسم المنتج (عربي)</label>
          <input
            type="text"
            name="nameAr"
            required
            value={form.nameAr}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* الاسم بالإنجليزي */}
        <div>
          <label className="block text-sm mb-1 font-bold">اسم المنتج (إنجليزي)</label>
          <input
            type="text"
            name="nameEn"
            required
            value={form.nameEn}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* الوصف بالعربي */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">الوصف (عربي)</label>
          <textarea
            name="descriptionAr"
            rows={3}
            value={form.descriptionAr}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* الوصف بالإنجليزي */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">الوصف (إنجليزي)</label>
          <textarea
            name="descriptionEn"
            rows={3}
            value={form.descriptionEn}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* السعر */}
        <div>
          <label className="block text-sm mb-1 font-bold">السعر</label>
          <input
            type="number"
            name="price"
            required
            value={form.price}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* المخزون */}
        <div>
          <label className="block text-sm mb-1 font-bold">الكمية المتوفرة</label>
          <input
            type="number"
            name="stock"
            required
            value={form.stock}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {/* رفع الصور */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1 font-bold">صور المنتج</label>
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
              <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded border" />
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed flex items-center justify-center rounded hover:bg-gray-50"
            >
              {uploading ? "..." : "+"}
            </button>
          </div>
          {uploadError && <p className="text-red-500 text-xs font-bold">{uploadError}</p>}
        </div>

        {/* الحالة */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            id="active"
            checked={form.active}
            onChange={handleChange}
          />
          <label htmlFor="active" className="text-sm font-bold">تفعيل المنتج في المتجر</label>
        </div>

        {/* رسائل الخطأ */}
        {error && <div className="md:col-span-2 text-red-500 text-sm font-bold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

        {/* أزرار التحكم */}
        <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
          <Link
            href="/admin/products"
            className="rounded-md border px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-md bg-black px-8 py-2 text-sm font-bold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ المنتج"}
          </button>
        </div>
      </form>
    </div>
  );
}