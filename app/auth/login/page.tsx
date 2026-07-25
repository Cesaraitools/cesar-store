"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { preserveGuestCartForAuth } from "@/context/CartContext";
import { isValidEmail, normalizeEmail } from "@/lib/formValidation";

function getSafeRedirectPath(redirect: string | null, fallback = "/") {
  if (!redirect) return fallback;
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return fallback;
  return redirect;
}

function isAndroidAppEnvironment() {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const url = new URL(window.location.href);
  const hasAppQuery =
    url.searchParams.get("app") === "android" ||
    url.searchParams.get("platform") === "android" ||
    url.searchParams.get("mobile_app") === "android";
  const hasAppUserAgent = userAgent.includes("CesarStoreApp/Android");
  const hasAppFlag = window.localStorage.getItem("cesar_store_mobile_app") === "android";
  const isCapacitorNative = Boolean(
    (window as typeof window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor?.isNativePlatform?.()
  );
  const isAndroidWebView =
    /\bAndroid\b/i.test(userAgent) &&
    (/\bwv\b/i.test(userAgent) || /Version\/\d+\.\d+/i.test(userAgent));

  if (hasAppQuery || hasAppUserAgent || hasAppFlag || isCapacitorNative || isAndroidWebView) {
    window.localStorage.setItem("cesar_store_mobile_app", "android");
    return true;
  }

  return false;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, user, loading: authLoading } = useAuth();

  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileApp, setIsMobileApp] = useState(true);
  const [appDetectionReady, setAppDetectionReady] = useState(false);
  const cleanEmail = normalizeEmail(email);
  const canSubmit = isValidEmail(cleanEmail) && password.length > 0;

  const target = getSafeRedirectPath(redirectParam);

  useEffect(() => {
    const detectMobileApp = () => {
      setIsMobileApp(isAndroidAppEnvironment());
      setAppDetectionReady(true);
    };

    detectMobileApp();
    const intervalId = window.setInterval(detectMobileApp, 250);
    const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 3000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, []);

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
      preserveGuestCartForAuth();

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

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

        {false && appDetectionReady && !isMobileApp && (
          <>
        <div className="my-6 text-center text-sm text-gray-400">
          أو عبر
        </div>

        <button
          onClick={() => signInWithGoogle(target)}
          className="w-full border p-3 rounded-lg mb-3"
        >
          Google Login
        </button>
          </>
        )}

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
