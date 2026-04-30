"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

/* ================= TYPES ================= */

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  stock?: number;
  name_ar?: string;
  name_en?: string;
  name?: string;
  price: number;
  image: string | null;
  quantity: number;
  created_at: string;
};

type LocalCart = {
  id: string;
  items: CartItem[];
};

type CartStateType = {
  cartId: string;
  cartItems: CartItem[];
};

type CartActionsType = {
  addToCart: (product: any) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
};

/* ================= STORAGE ================= */

const CART_STORAGE_KEY = "cesar_store_cart_v2";

function generateUUID() {
  return crypto.randomUUID();
}

function loadCartFromStorage(): LocalCart {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { id: generateUUID(), items: [] };
    return JSON.parse(raw);
  } catch {
    return { id: generateUUID(), items: [] };
  }
}

function saveCartToStorage(cart: LocalCart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {}
}

/* ================= CONTEXTS ================= */

const CartStateContext = createContext<CartStateType | null>(null);
const CartActionsContext = createContext<CartActionsType | null>(null);

/* ================= PROVIDER ================= */

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();

  const [cart, setCart] = useState<LocalCart>({
    id: "",
    items: [],
  });

  const hasSyncedWithApi = useRef(false);

  /* ================= INIT ================= */

  useEffect(() => {
    const stored = loadCartFromStorage();
    setCart(stored);
  }, []);

  useEffect(() => {
    if (!cart.id) return;
    saveCartToStorage(cart);
  }, [cart]);

  /* ================= ACTIONS ================= */

  const addToCart = (product: any) => {
    const existing = cart.items.find(
      (item) => item.product_id === product.id
    );

    if (existing) {
      toast.error("المنتج موجود بالفعل في السلة");
      return;
    }

    const newItem: CartItem = {
  id: generateUUID(),
  cart_id: cart.id,
  product_id: product.id,
  stock: product.stock ?? product.quantity ?? 0,
  name_ar: product.name_ar || product.name || "",
  name_en: product.name_en || product.name || "",
  name: product.name || "Product",
  price: Number(product.price),
  image: product.image || null,
  quantity: 1,
  created_at: new Date().toISOString(),
};

    setCart((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
  setCart((prev) => ({
    ...prev,
    items: prev.items.map((item) => {
      if (item.id !== cartItemId) return item;

      const max = item.stock ?? 9999;

      if (quantity > max) {
        toast.error(`الحد الأقصى المتاح هو ${max}`);
        return { ...item, quantity: max };
      }

      return {
        ...item,
        quantity: Math.max(1, quantity),
      };
    }),
  }));
};
  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== cartItemId),
    }));
  };

  const clearCart = () => {
    setCart({
      id: cart.id,
      items: [],
    });
  };

  /* ================= VALUES ================= */

  const stateValue: CartStateType = {
    cartId: cart.id,
    cartItems: cart.items,
  };

  const actionsValue: CartActionsType = {
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartActionsContext.Provider value={actionsValue}>
        {children}
      </CartActionsContext.Provider>
    </CartStateContext.Provider>
  );
}

/* ================= HOOKS ================= */

export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) {
    throw new Error("useCartState must be used inside CartProvider");
  }
  return context;
}

export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (!context) {
    throw new Error("useCartActions must be used inside CartProvider");
  }
  return context;
}

/* ================= SAFE (OLD API) ================= */

export function useCart() {
  const state = useCartState();
  const actions = useCartActions();

  return {
    ...state,
    ...actions,
  };
}