// app/(checkout)/review/page.tsx

"use client";
import { formatCurrency } from "@/lib/formatCurrency";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/context/CheckoutContext";
import { useOrderTracking } from "@/context/OrderTrackingContext";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  ChevronRight,
  Loader2,
  PackageCheck,
  MessageCircle
} from "lucide-react";

/* ---------------- Local Orders Helpers ---------------- */
const ORDERS_STORAGE_KEY = "cesar_store_orders";

function generateUUID() {
  return crypto.randomUUID();
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveOrders(orders: any[]) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}

/* ---------------- Page ---------------- */
export default function ReviewPage() {

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, clearCart } = useCart();
  const { checkoutData } = useCheckout();
  const { addEvent } = useOrderTracking();

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
  router.replace("/auth/login?redirect=/review");
  return; // 🔥 مهم جدًا
}
  }, [authLoading, user, router]);

  if (authLoading) {
    if (!user) return null;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white" dir="rtl">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="font-bold text-slate-500">جاري التحقق من الهوية...</p>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#F8FAFC]" dir="rtl">
        <ShoppingBag size={60} className="text-slate-200" />
        <p className="text-xl font-black text-slate-400">سلة المشتريات فارغة</p>
        <button
          onClick={() => router.push("/")}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold"
        >
          العودة للمتجر
        </button>
      </div>
    );
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleConfirmOrder = async () => {

    if (isSubmitting) return;

    setIsSubmitting(true);

    let orderId = "";

    try {

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
  toast.error("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
  setIsSubmitting(false);
  router.push("/auth/login?redirect=/review");
  return;
}

      const customerSnapshot = {
        name: checkoutData.name,
        phone: checkoutData.phone,
        address: checkoutData.address,
      };
      const orderToken = crypto.randomUUID();
     const itemsSnapshot = cartItems.map((item) => ({
  id: generateUUID(),
  product_id: item.product_id,

  // ✅ FIX: دعم العربي والانجليزي
  name_ar: item.name_ar || item.name || "",
  name_en: item.name_en || item.name || "",

  price: item.price,
  image: item.image,
  quantity: item.quantity,
}));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          total: total,
          currency: "EGP",
          customer: customerSnapshot,
          items: itemsSnapshot,
          order_token: orderToken,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (typeof result?.available === "number") {
          toast.error(`الكمية المتاحة حاليًا هي ${result.available} فقط`);
          return;
        }

        toast.error(result?.error || "Failed to create order");
        return;
      }
      orderId = result?.orderId ?? "";

      if (!orderId) {
        toast.error("تعذر استكمال الطلب، حاول مرة أخرى");
        return;
      }

      saveOrders([
        ...loadOrders(),
        {
          id: orderId,
          status: "requested",
          total,
          created_at: new Date().toISOString(),
          customer: customerSnapshot,
        },
      ]);

      addEvent(orderId, "requested");

      /* ================== ✅ FIXED WHATSAPP MESSAGE ================== */

      const productsText = cartItems
        .map(
          (item) =>
            `- ${item.name} × ${item.quantity} = ${item.price * item.quantity} ج`
        )
        .join("\n");

      const message = `طلب جديد من متجر سيزر 🛒

👤 الاسم: ${checkoutData.name}
📞 الهاتف: ${checkoutData.phone}
📍 العنوان: ${checkoutData.address}

🛒 المنتجات:
${productsText}

💰 الإجمالي: ${formatCurrency(total)}`;

      const whatsappWindow = window.open(
  `https://wa.me/201211120208?text=${encodeURIComponent(message)}`,
  "_blank"
);

if (!whatsappWindow) {
  toast("تعذر فتح واتساب ⚠️", {
  icon: "⚠️",
});
}

      /* ============================================================= */
        toast.success("تم إنشاء الطلب بنجاح 🎉");
      await clearCart();

      router.push(`/confirm?orderId=${orderId}`);

    } catch (err) {

      console.error(err);
      toast.error("حدث خطأ، حاول مرة أخرى");

    } finally {

      setIsSubmitting(false);

    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-10 px-4" dir="rtl">

      <div className="max-w-5xl mx-auto text-right">

        <h1 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-3">
          <PackageCheck size={32} className="text-blue-600" />
          مراجعة طلبك
        </h1>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Main Content */}

          <div className="lg:col-span-7 space-y-6">

            {/* Items */}

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">

              <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <ShoppingBag size={18} className="text-blue-600" />
                المنتجات ({cartItems.length})
              </h2>

              <div className="space-y-6">

                {cartItems.map((item) => (

                  <div
                    key={item.id}
                    className="flex justify-between items-center border-b border-slate-50 pb-4 last:border-0"
                  >

                    <div className="flex items-center gap-4">

                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-blue-600">
                        {item.quantity}x
                      </div>

                      <div>
                        <p className="font-bold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                    </div>

                    <span className="font-black text-slate-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>

                  </div>

                ))}

              </div>
            </div>

            {/* Customer Info */}

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">

              <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                معلومات التوصيل
              </h2>

              <div className="grid md:grid-cols-2 gap-6">

                <div className="space-y-4">

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      الاسم
                    </p>
                    <p className="font-bold text-slate-700">
                      {checkoutData.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      الهاتف
                    </p>
                    <p className="font-bold text-slate-700" dir="ltr">
                      {checkoutData.phone}
                    </p>
                  </div>

                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    العنوان
                  </p>
                  <p className="font-bold text-slate-700 leading-relaxed">
                    {checkoutData.address}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Sidebar */}

          <div className="lg:col-span-5">

            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 sticky top-10">

              <div className="flex items-center gap-3 mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-50">
                <ShieldCheck size={20} className="text-blue-600" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-tighter">
                  مراجعة نهائية
                </span>
              </div>

              <div className="space-y-4 border-b border-dashed border-slate-100 pb-6 mb-6">

                <div className="flex justify-between font-bold text-slate-400">
                  <span>المجموع</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                <div className="flex justify-between font-bold text-slate-400">
                  <span>التوصيل</span>
                  <span className="text-xs italic">حسب العنوان</span>
                </div>

              </div>

              <div className="flex justify-between items-center mb-8">

                <span className="text-xl font-black text-slate-900">
                  الإجمالي الصافي
                </span>

                <span className="text-3xl font-black text-blue-600 tracking-tighter">
                 {formatCurrency(total)}
                </span>

              </div>

              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >

                {isSubmitting ? (
  <>
    <Loader2 className="animate-spin" />
    جاري إرسال الطلب...
  </>
) : (
                  <>
                    <MessageCircle size={22} fill="currentColor" />
                    تأكيد وإرسال لواتساب
                  </>
                )}

              </button>

              <button
                onClick={() => router.back()}
                className="w-full mt-4 text-slate-400 font-bold text-sm flex items-center justify-center gap-1 hover:text-slate-600 transition-colors"
              >
                <ChevronRight size={16} />
                تعديل البيانات
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
