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
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {new Date(err.lastSeen).toLocaleString()}
              </span>

              <span className="text-xs font-bold text-red-600">
                {err.level.toUpperCase()}
              </span>
            </div>

            <h2 className="font-bold text-gray-900 mt-2">
              {err.title}
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {err.culprit}
            </p>

            <div className="text-xs text-gray-400 mt-2">
              عدد التكرار: {err.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}