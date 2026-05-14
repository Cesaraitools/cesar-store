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
const PENDING_ORDER_TOKEN_KEY = "cesar_store_pending_order_token";

function getPendingOrderToken() {
  try {
    const existing = sessionStorage.getItem(PENDING_ORDER_TOKEN_KEY);
    if (existing) return existing;

    const next = crypto.randomUUID();
    sessionStorage.setItem(PENDING_ORDER_TOKEN_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

function clearPendingOrderToken() {
  try {
    sessionStorage.removeItem(PENDING_ORDER_TOKEN_KEY);
  } catch {}
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { cartItems, clearCart } = useCart();

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

      const itemsSnapshot = cartItems.map((item) => ({
        product_id: item.product_id,
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
          currency: "EGP",
          customer: {
            name: checkoutData.name,
            phone: checkoutData.phone,
            address: checkoutData.address,
            city: checkoutData.city,
            notes: checkoutData.notes,
          },
          items: itemsSnapshot,
          order_token: getPendingOrderToken(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.orderId) {
        throw new Error(result?.error || "خطأ في إنشاء الطلب");
      }

      // مسح السلة والبيانات المحفوظة
      clearPendingOrderToken();
      await clearCart({ sync: false });
      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      setCheckoutDataState({
        name: "",
        phone: "",
        city: "",
        address: "",
        notes: "",
      });

      return result.orderId;
    } catch (err: any) {
      const message = err.message || "خطأ في إنشاء الطلب";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [user, session, cartItems, checkoutData, clearCart]);

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
