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

/* ---------------- Types ---------------- */

export type CartItem = {
  id: string; // UUID
  cart_id: string;
  product_id: string;
  name: string; // snapshot
  price: number; // snapshot
  image: string | null; // snapshot
  quantity: number;
  created_at: string;
};

type LocalCart = {
  id: string;
  items: CartItem[];
};

type CartContextType = {
  cartId: string;
  cartItems: CartItem[];
  addToCart: (product: any) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
};

/* ---------------- Constants ---------------- */

const CART_STORAGE_KEY = "cesar_store_cart_v2";

/* ---------------- Helpers ---------------- */

function generateUUID() {
  return crypto.randomUUID();
}

function sanitizeImage(image?: string): string | null {
  if (!image) return null;
  if (image.startsWith("blob:")) return null;
  if (image.includes("\\")) return null;
  if (image.startsWith("/") || image.startsWith("http")) return image;
  return null;
}

function loadCartFromStorage(): LocalCart {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return { id: generateUUID(), items: [] };
    }
    return JSON.parse(raw) as LocalCart;
  } catch {
    return { id: generateUUID(), items: [] };
  }
}

function saveCartToStorage(cart: LocalCart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {}
}

/* ---------------- Context ---------------- */

const CartContext = createContext<CartContextType | null>(null);

/* ---------------- Provider ---------------- */

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();

  const [cart, setCart] = useState<LocalCart>({
    id: "",
    items: [],
  });

  const hasSyncedWithApi = useRef(false);

  /* ---------- Load cart once ---------- */
  useEffect(() => {
    const stored = loadCartFromStorage();
    setCart(stored);
  }, []);

  /* ---------- Persist cart ---------- */
  useEffect(() => {
    if (!cart.id) return;
    saveCartToStorage(cart);
  }, [cart]);

  /* ---------- DB Cart (Deferred / Fail-safe) ---------- */
  const ensureCartExistsInDb = async () => {
    if (!user) return;
    if (!session) return;
    if (hasSyncedWithApi.current) return;

    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      hasSyncedWithApi.current = true;
    } catch {}
  };

  /* ---------------- Actions ---------------- */

  const addToCart = (product: any) => {
    ensureCartExistsInDb();

    setCart((prev) => {
      const existing = prev.items.find(
        (item) => item.product_id === product.id
      );

      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      const newItem: CartItem = {
        id: generateUUID(),
        cart_id: prev.id,
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        image: sanitizeImage(product.image),
        quantity: 1,
        created_at: new Date().toISOString(),
      };

      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity }
          : item
      ),
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

  return (
    <CartContext.Provider
      value={{
        cartId: cart.id,
        cartItems: cart.items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* ---------------- Hook ---------------- */

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}