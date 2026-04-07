"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function RegisterPage() {
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
      return setError("يجب إكمال الحقول");
    }

    try {
      setLoading(true);

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("فشل إنشاء المستخدم");

      /**
       * NOTE:
       * user profile row is created by the database trigger
       * (handle_new_user) after auth.users insertion.
       * We intentionally do NOT insert into public.users here
       * to keep Trigger as the Single Source of Truth.
       */

      setSuccess(true);

    } catch (err: any) {
      setError(err.message || "حدث خطأ");

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
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-gray-800">تم إنشاء حسابك!</h2>
            <p className="text-gray-500 text-sm">
              أهلاً بك في عائلة متجر سيزر، يمكنك الآن تسجيل الدخول.
            </p>

            <Link
              href="/auth/login"
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
              href="/auth/login"
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