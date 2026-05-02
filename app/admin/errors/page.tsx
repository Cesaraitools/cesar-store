"use client";

import { useEffect, useState } from "react";

type ErrorItem = {
  id: string;
  title: string;
  culprit: string;
  count: number;
  lastSeen: string;
  level: string;
};

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

      {errors.length === 0 && (
        <div className="text-gray-500 text-sm">
          لا توجد أخطاء حالياً 🎉
        </div>
      )}

      <div className="grid gap-4">
        {errors.map((err) => (
          <div
            key={err.id}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {new Date(err.lastSeen).toLocaleString()}
              </span>

              <span
                className={`text-xs font-bold px-2 py-1 rounded ${getLevelStyles(
                  err.level
                )}`}
              >
                {err.level.toUpperCase()}
              </span>
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