"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, CreditCard } from "lucide-react";

export default function CartPage() {
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const decreaseQuantity = (item: any) => {
    if (item.quantity === 1) return;
    updateQuantity(item.id, item.quantity - 1);
  };

  const increaseQuantity = (item: any) => {
    addToCart({
      id: item.product_id,
      name: item.name,
      price: item.price,
      image: item.image,
    });
  };

  const total = cartItems.reduce(
    (acc: number, item: any) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[#FCFDFF] py-12 px-4 md:px-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* Header - عنوان السلة */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
            <ShoppingBag className="text-blue-600" size={32} />
            سلة المشتريات
          </h1>
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl font-black text-sm">
            {cartItems.length} منتجات
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center border border-dashed border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={40} className="text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-2 text-center">السلة فارغة حالياً</p>
            <p className="text-gray-400 font-bold mb-8 text-center">ابدأ بإضافة بعض المنتجات الرائعة لسيارتك</p>
            <Link href="/shop" className="inline-flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-gray-200">
              تصفح المتجر
              <ArrowRight size={18} className="rotate-180" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10 items-start">
            
            {/* قائمة المنتجات */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[2rem] p-5 flex flex-col sm:flex-row items-center gap-6 border border-gray-100 shadow-sm transition-all hover:shadow-md group"
                >
                  {/* صورة المنتج */}
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-50">
                    <img
                      src={item.image || "/placeholder.png"}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* بيانات المنتج */}
                  <div className="flex-1 text-center sm:text-right">
                    <h2 className="text-lg font-black text-gray-900 mb-1">{item.name}</h2>
                    <p className="text-blue-600 font-black text-sm mb-4">
                      {item.price} جنيه
                    </p>

                    {/* التحكم في الكمية بتصميم عصري */}
                    <div className="inline-flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                      <button
                        onClick={() => decreaseQuantity(item)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-500 hover:text-rose-600 shadow-sm active:scale-90 transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center font-black text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => increaseQuantity(item)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-500 hover:text-blue-600 shadow-sm active:scale-90 transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* الإجمالي الجانبي وزر الحذف */}
                  <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 w-full sm:w-auto sm:border-r sm:pr-6 sm:mr-2 border-gray-100">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 text-center">إجمالي الصنف</p>
                      <p className="text-lg font-black text-gray-900">{item.price * item.quantity} جنيه</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ملخص الطلب الفخم */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-100/50 sticky top-28">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="text-blue-600" size={20} />
                ملخص الطلب
              </h2>

              <div className="space-y-4 mb-8">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start text-sm pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-gray-400 font-bold text-xs mt-1">
                        {item.quantity} × {item.price} جنيه
                      </p>
                    </div>
                    <span className="font-black text-gray-900 whitespace-nowrap">
                      {item.price * item.quantity} ج.م
                    </span>
                  </div>
                ))}
              </div>

              {/* الإجمالي النهائي */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-8">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-500 font-bold text-sm">المجموع الكلي</span>
                  <span className="text-2xl font-black text-blue-600 tracking-tighter">{total} جنيه</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold text-center mt-2">السعر شامل ضريبة القيمة المضافة</p>
              </div>

              <Link
                href="/checkout"
                className="group relative w-full bg-gray-900 text-white py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-xl shadow-gray-200 active:scale-[0.98] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-10"></div>
                إتمام الطلب
                <ArrowRight size={20} className="rotate-180" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}