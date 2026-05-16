"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

type ErrorItem = {
  id: string;
  title: string;
  culprit: string;
  count: number;
  lastSeen: string;
  level: string;
};

const DISMISSED_ERRORS_STORAGE_KEY = "cesar-admin-dismissed-error-ids";

function getLevelStyles(level: string) {
  switch (level) {
    case "error":
      return "bg-red-50 text-red-600";
    case "warning":
      return "bg-yellow-50 text-yellow-600";
    case "info":
      return "bg-blue-50 text-blue-600";
    default:
      return "bg-gray-50 text-gray-600";
  }
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleErrors = errors.filter((err) => !dismissedIds.includes(err.id));
  const allVisibleSelected =
    visibleErrors.length > 0 &&
    visibleErrors.every((err) => selectedIds.includes(err.id));

  function saveDismissedIds(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids));

    setDismissedIds(uniqueIds);
    setSelectedIds((current) => current.filter((id) => !uniqueIds.includes(id)));
    window.localStorage.setItem(
      DISMISSED_ERRORS_STORAGE_KEY,
      JSON.stringify(uniqueIds)
    );
  }

  function dismissErrors(ids: string[]) {
    if (ids.length === 0) return;
    saveDismissedIds([...dismissedIds, ...ids]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleErrors.some((err) => err.id === id))
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...visibleErrors.map((err) => err.id)]))
    );
  }

  async function loadErrors() {
    try {
      const res = await fetch("/api/admin/errors");

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setErrors(data.errors || []);
    } catch {
      console.error("Failed to load errors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedDismissedIds = window.localStorage.getItem(
      DISMISSED_ERRORS_STORAGE_KEY
    );

    if (storedDismissedIds) {
      try {
        const parsedIds = JSON.parse(storedDismissedIds);
        if (Array.isArray(parsedIds)) {
          setDismissedIds(parsedIds.filter((id) => typeof id === "string"));
        }
      } catch {
        window.localStorage.removeItem(DISMISSED_ERRORS_STORAGE_KEY);
      }
    }

    loadErrors();

    // 🔄 Auto refresh كل 30 ثانية
    const interval = setInterval(loadErrors, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-blue-600 font-bold">
        جاري تحميل الأخطاء...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-right" dir="rtl">
      <h1 className="text-2xl font-black text-gray-900">
        سجل الأخطاء (Sentry)
      </h1>

      {visibleErrors.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4"
            />
            تحديد كل الإشعارات الظاهرة
          </label>

          <button
            type="button"
            onClick={() => dismissErrors(selectedIds)}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            <Trash2 size={16} />
            مسح المحدد ({selectedIds.length})
          </button>
        </div>
      )}

      {visibleErrors.length === 0 && (
        <div className="text-gray-500 text-sm">
          لا توجد أخطاء حالياً 🎉
        </div>
      )}

      <div className="grid gap-4">
        {visibleErrors.map((err) => (
          <div
            key={err.id}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(err.id)}
                  onChange={() => toggleSelected(err.id)}
                  aria-label="تحديد إشعار الخطأ"
                  className="h-4 w-4"
                />

                <span className="text-xs text-gray-400">
                  {new Date(err.lastSeen).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${getLevelStyles(
                    err.level
                  )}`}
                >
                  {err.level.toUpperCase()}
                </span>

                <button
                  type="button"
                  onClick={() => dismissErrors([err.id])}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                  aria-label="مسح إشعار الخطأ من لوحة الأدمن"
                  title="مسح من لوحة الأدمن فقط"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Title */}
            <h2 className="font-bold text-gray-900 mt-2">
              {err.title}
            </h2>

            {/* Culprit */}
            <p className="text-xs text-gray-500 mt-1">
              {err.culprit}
            </p>

            {/* Count */}
            <div className="text-xs text-gray-400 mt-2">
              عدد التكرار: {err.count}
            </div>

            {/* 🔗 Sentry Link */}
            <div className="mt-3">
              <a
                href={`https://sentry.io/organizations/cesar-store/issues/${err.id}`}
                target="_blank"
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                فتح في Sentry ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
