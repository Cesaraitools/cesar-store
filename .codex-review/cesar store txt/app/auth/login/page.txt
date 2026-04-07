"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle } = useAuth();

  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = redirectParam || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("يرجى إدخال البيانات");
      return;
    }

    try {
      setLoading(true);

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      router.push(target);
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${target}`,
      },
    });
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
            onChange={(e) => setEmail(e.target.value)}
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
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-lg"
          >
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </button>

        </form>

        <div className="my-6 text-center text-sm text-gray-400">
          أو عبر
        </div>

        <button
          onClick={() => signInWithGoogle(target)}
          className="w-full border p-3 rounded-lg mb-3"
        >
          Google Login
        </button>

        <button
          onClick={handleAppleLogin}
          className="w-full bg-black text-white p-3 rounded-lg"
        >
          Apple Login
        </button>

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