"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const storedNotice = window.sessionStorage.getItem("category-admin-notice");
    if (storedNotice) {
      setNotice(storedNotice);
      window.sessionStorage.removeItem("category-admin-notice");
    }

    fetch("/api/categories?admin=true", {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load categories");
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid categories response");
        }

        setCategories(data);
      })
      .catch((err) => {
        console.error("Failed to load categories", err);
        setLoadError("Failed to load categories. Please refresh and try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    const ok = confirm("Are you sure you want to delete this category?");
    if (!ok) return;

    setDeletingId(id);

    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        alert("Failed to delete category");
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Error deleting category");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="p-10">
        <p className="text-gray-500">Loading categories...</p>
      </main>
    );
  }

  return (
    <main className="p-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>

        <Link
          href="/admin/categories/add"
          className="rounded-lg bg-sky-500 px-5 py-2 text-white font-semibold hover:bg-sky-600 transition"
        >
          + Add Category
        </Link>
      </div>

      {notice && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      )}

      {loadError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Arabic Title</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-center">Order</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-t">
                <td className="px-4 py-3">
                  <img
                    src={cat.image}
                    alt={cat.en.title}
                    className="h-14 w-24 object-cover rounded-md"
                  />
                </td>

                <td className="px-4 py-3 font-medium">
                  {cat.ar.title}
                </td>

                <td className="px-4 py-3 text-gray-500">
                  {cat.category}
                </td>

                <td className="px-4 py-3 text-center">
                  {cat.order}
                </td>

                <td className="px-4 py-3 text-center">
                  {cat.active ? "Yes" : "No"}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-center gap-3">
                    <Link
                      href={`/admin/categories/edit/${cat.id}`}
                      className="rounded-md bg-sky-100 px-3 py-1 text-sky-700 hover:bg-sky-200 transition"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      className="rounded-md bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200 transition disabled:opacity-50"
                    >
                      {deletingId === cat.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {categories.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No categories found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
