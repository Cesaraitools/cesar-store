// context/CheckoutContext.tsx - نسخة محسّنة
"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "./CartContext";
import { cartService } from "@/lib/services/cartService";
import { orderService } from "@/lib/services/orderService";

export type CheckoutData = {
  name: string;
  phone: string;
  city?: string;
  address: string;
  notes?: string;
};

type CheckoutContextType = {
  checkoutData: CheckoutData;
  setCheckoutData: (data: CheckoutData) => void;
  loading: boolean;
  error: string | null;
  submitOrder: () => Promise<string>; // يرجع order ID
  resetCheckout: () => void;
};

const CheckoutContext = createContext<CheckoutContextType | null>(null);

const CHECKOUT_STORAGE_KEY = "cesar_store_checkout";

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { cartId, cartItems, clearCart } = useCart();

  const [checkoutData, setCheckoutDataState] = useState<CheckoutData>({
    name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ========== Load from localStorage ========== */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (saved) {
        setCheckoutDataState(JSON.parse(saved));
      }
    } catch {}
  }, []);

  /* ========== Update checkout data ========== */

  const setCheckoutData = useCallback((data: CheckoutData) => {
    setCheckoutDataState(data);
    try {
      localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  /* ========== Submit order ========== */

  const submitOrder = useCallback(async (): Promise<string> => {
    if (!user || !session) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }

    if (cartItems.length === 0) {
      throw new Error("السلة فارغة");
    }

    if (
      !checkoutData.name ||
      !checkoutData.phone ||
      !checkoutData.address
    ) {
      throw new Error("الرجاء ملء جميع الحقول المطلوبة");
    }

    try {
      setLoading(true);
      setError(null);

      // جلب تفاصيل المنتجات للطلب
      const cartWithDetails = await cartService.getCartWithProductDetails(
        cartId
      );

      if (cartWithDetails.length === 0) {
        throw new Error("السلة فارغة أو غير صحيحة");
      }

      // تحضير عناصر الطلب
      const orderItems = cartWithDetails.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      // إنشاء الطلب
      const order = await orderService.createOrder(
        user.id,
        cartId,
        {
          name: checkoutData.name,
          phone: checkoutData.phone,
          address: checkoutData.address,
          city: checkoutData.city,
          notes: checkoutData.notes,
        },
        orderItems
      );

      // مسح السلة والبيانات المحفوظة
      await clearCart();
      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      setCheckoutDataState({
        name: "",
        phone: "",
        city: "",
        address: "",
        notes: "",
      });

      return order.id;
    } catch (err: any) {
      const message = err.message || "خطأ في إنشاء الطلب";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [user, session, cartId, cartItems, checkoutData, clearCart]);

  /* ========== Reset checkout ========== */

  const resetCheckout = useCallback(() => {
    setCheckoutDataState({
      name: "",
      phone: "",
      city: "",
      address: "",
      notes: "",
    });
    setError(null);
    localStorage.removeItem(CHECKOUT_STORAGE_KEY);
  }, []);

  return (
    <CheckoutContext.Provider
      value={{
        checkoutData,
        setCheckoutData,
        loading,
        error,
        submitOrder,
        resetCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within CheckoutProvider");
  }
  return context;
} 