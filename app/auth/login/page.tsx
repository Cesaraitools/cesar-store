"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isValidEmail, normalizeEmail } from "@/lib/formValidation";

function getSafeRedirectPath(redirect: string | null, fallback = "/") {
  if (!redirect) return fallback;
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return fallback;
  return redirect;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, user, loading: authLoading } = useAuth();

  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanEmail = normalizeEmail(email);
  const canSubmit = isValidEmail(cleanEmail) && password.length > 0;

  const target = getSafeRedirectPath(redirectParam);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(target);
    }
  }, [authLoading, router, target, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanEmail || !password) {
      setError("يرجى إدخال البيانات");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }

    try {
      setLoading(true);
      const signInError = await signInWithPassword(cleanEmail, password);

      if (signInError) throw signInError;

      router.push(target);
    } catch {
      setError("تعذر تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f4f4] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <h1 className="text-2xl font-bold text-center mb-6">
          CESAR STORE
        </h1>

        {error && (
          <div className="mb-4 text-red-500 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
            inputMode="email"
            autoComplete="email"
            aria-invalid={email.length > 0 && !isValidEmail(cleanEmail)}
            required
            className="w-full p-3 border rounded-lg"
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full bg-black text-white p-3 rounded-lg"
          >
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </button>

        </form>

        <p className="text-center text-sm mt-6">
          ليس لديك حساب؟{" "}
          <Link href="/auth/register" className="text-orange-600">
            إنشاء حساب
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
