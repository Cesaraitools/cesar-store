"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function getRegisterErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (message.includes("already registered")) {
    return "هذا البريد مسجل بالفعل، قم بتسجيل الدخول";
  }

  if (message.includes("invalid email")) {
    return "البريد الإلكتروني غير صحيح";
  }

  if (message.includes("Password should be")) {
    return "كلمة المرور ضعيفة (على الأقل 6 أحرف)";
  }

  return "حدث خطأ، حاول مرة أخرى";
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const loginHref = redirectParam
    ? `/auth/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/auth/login";

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !phone || !password) {
      setError("يجب إكمال الحقول");
      return;
    }

    try {
      setLoading(true);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone,
          },
        },
      });

      if (signUpError) {
        setError(getRegisterErrorMessage(signUpError));
        return;
      }

      if (!data.user) {
        throw new Error("فشل إنشاء المستخدم");
      }

      const isDuplicateSignup =
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0;

      if (isDuplicateSignup) {
        setError("هذا البريد مسجل بالفعل، قم بتسجيل الدخول");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.href = loginHref;
      }, 1500);
    } catch (err) {
      setError(getRegisterErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md bg-gray-50/50 rounded-[2.5rem] border border-gray-100 p-8 md:p-12 shadow-xl">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-black text-black">انضم إلى سيزر</h1>
          <div className="w-12 h-1.5 bg-orange-500 mx-auto mt-2 rounded-full"></div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-[11px] rounded-2xl border border-red-100 text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-10 space-y-4">
            <div className="text-5xl">تم</div>
            <h2 className="text-xl font-bold text-gray-800">تم إنشاء حسابك!</h2>
            <p className="text-gray-500 text-sm">
              أهلاً بك في عائلة متجر سيزر، يمكنك الآن تسجيل الدخول.
            </p>

            <Link
              href={loginHref}
              className="block w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              className="w-full bg-white border border-gray-200 px-6 py-4 rounded-2xl text-right focus:border-orange-500 transition-all outline-none shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="tel"
              placeholder="رقم الهاتف"
              className="w-full bg-white border border-gray-200 px-6 py-4 rounded-2xl text-right focus:border-orange-500 transition-all outline-none shadow-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="كلمة المرور"
              className="w-full bg-white border border-gray-200 px-6 py-4 rounded-2xl text-right focus:border-orange-500 transition-all outline-none shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 mt-6"
            >
              {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب الآن"}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center">
            <Link
              href={loginHref}
              className="text-gray-500 text-sm font-medium hover:text-black transition-colors"
            >
              عودة لتسجيل الدخول
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
