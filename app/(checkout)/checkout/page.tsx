"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/context/CheckoutContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

import {
  User,
  Phone,
  MapPin,
  Building2,
  ClipboardList,
  ShoppingBag,
  ChevronLeft,
  ShieldCheck
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();

  const { user, loading } = useAuth();
  const { setCheckoutData } = useCheckout();
  const { cartItems } = useCart();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });

  /**
   * Checkout Guard
   * يمنع الدخول للصفحة بدون تسجيل دخول
   */
  useEffect(() => {
    if (!loading && !user) {
      const current = window.location.pathname;
      router.push(`/auth/login?redirect=${encodeURIComponent(current)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || !formData.address) {
      alert("من فضلك املأ الاسم ورقم الهاتف والعنوان");
      return;
    }

    setCheckoutData({
      name: formData.name,
      phone: formData.phone,
      city: formData.city,
      address: formData.address,
      notes: formData.notes,
    });

    router.push("/review");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 pt-6 px-4 md:px-6" dir="rtl">
      <div className="max-w-5xl mx-auto">

        {/* Progress Header */}
        <div className="flex items-center justify-center mb-10 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-100">
              1
            </div>
            <span className="font-black text-slate-900 text-sm">البيانات</span>
          </div>

          <div className="w-12 h-[2px] bg-slate-200"></div>

          <div className="flex items-center gap-2 opacity-40">
            <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold">
              2
            </div>
            <span className="font-bold text-slate-600 text-sm">المراجعة</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start text-right">

          {/* Form Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <User size={20} />
                </div>
                بيانات الشحن
              </h2>

              <div className="space-y-5">

                {/* Name */}
                <div className="relative group">
                  <label className="text-xs font-black text-slate-400 mb-2 block mr-1 uppercase tracking-wider">
                    الاسم بالكامل
                  </label>

                  <div className="relative">
                    <User
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                      size={18}
                    />

                    <input
                      name="name"
                      placeholder="اكتب اسمك الثلاثي"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="relative group">
                  <label className="text-xs font-black text-slate-400 mb-2 block mr-1 uppercase tracking-wider">
                    رقم الهاتف
                  </label>

                  <div className="relative">
                    <Phone
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                      size={18}
                    />

                    <input
                      name="phone"
                      type="tel"
                      placeholder="رقم الموبايل للتواصل"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">

                  {/* City */}
                  <div className="relative group">
                    <label className="text-xs font-black text-slate-400 mb-2 block mr-1 uppercase tracking-wider">
                      المحافظة / المدينة
                    </label>

                    <div className="relative">
                      <Building2
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />

                      <input
                        name="city"
                        placeholder="القاهرة، الجيزة..."
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border-none rounded-2xl pr-12 pl-4 py-4 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="relative group">
                    <label className="text-xs font-black text-slate-400 mb-2 block mr-1 uppercase tracking-wider">
                      العنوان التفصيلي
                    </label>

                    <div className="relative">
                      <MapPin
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />

                      <input
                        name="address"
                        placeholder="اسم الشارع، رقم العقار"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border-none rounded-2xl pr-12 pl-4 py-4 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="relative group">
                  <label className="text-xs font-black text-slate-400 mb-2 block mr-1 uppercase tracking-wider">
                    ملاحظات إضافية (اختياري)
                  </label>

                  <textarea
                    name="notes"
                    placeholder="مواعيد التواجد، علامة مميزة بجانب العنوان..."
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all font-bold text-slate-700 resize-none"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 sticky top-6">

              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <ShoppingBag size={20} className="text-blue-600" />
                ملخص طلبك
              </h3>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6 text-sm">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center font-black text-xs text-slate-400">
                        {item.quantity}x
                      </div>

                      <span className="font-bold text-slate-700">
                        {item.name}
                      </span>
                    </div>

                    <span className="font-black text-slate-900">
                      {item.price * item.quantity} ج.م
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-100 pt-6 space-y-3">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black text-slate-900">
                    الإجمالي
                  </span>

                  <div className="text-left">
                    <span className="text-3xl font-black text-blue-600 tracking-tighter">
                      {total}
                    </span>

                    <span className="text-xs font-black text-blue-600 mr-1">
                      جنيه
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-slate-900 text-white mt-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                متابعة المراجعة
                <ChevronLeft size={20} />
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}