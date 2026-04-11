// context/CartContext.tsx - نسخة محسّنة
"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { cartService } from "@/lib/services/cartService";

/* ============ Types ============ */

export type CartItem = {
  id: string;
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
  loading: boolean;
  error: string | null;
  total: number;
  addToCart: (product: any) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

/* ============ Constants ============ */

const CART_STORAGE_KEY = "cesar_store_cart_v2";

/* ============ Helpers ============ */

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

/* ============ Context ============ */

const CartContext = createContext<CartContextType | null>(null);

/* ============ Provider ============ */

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();

  const [cart, setCart] = useState<LocalCart>({
    id: "",
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const hasSyncedWithDb = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  /* ========== Load cart once from localStorage ========== */

  useEffect(() => {
    const stored = loadCartFromStorage();
    setCart(stored);
  }, []);

  /* ========== Sync with DB when user logs in ========== */

  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (hasSyncedWithDb.current) return;

    const syncWithDb = async () => {
      try {
        setLoading(true);
        const dbCart = await cartService.getOrCreateUserCart(user.id);

        if (dbCart && dbCart.id) {
          // تحويل cart_items من قاعدة البيانات إلى صيغة محلية
          const cartItems = (dbCart.cart_items || []).map(
            (item: any) => ({
              ...item,
              name: item.name || "",
              price: item.price || 0,
              image: null, // سيتم جلبها لاحقاً من ProductDetails
            })
          );

          setCart({
            id: dbCart.id,
            items: cartItems,
          });

          hasSyncedWithDb.current = true;
          saveCartToStorage({ id: dbCart.id, items: cartItems });
        }
      } catch (err: any) {
        console.error("Sync error:", err);
        setError("فشل تزامن السلة");
      } finally {
        setLoading(false);
      }
    };

    syncWithDb();
  }, [authLoading, user, session]);

  /* ========== Persist cart to localStorage ========== */

  useEffect(() => {
    if (!cart.id) return;
    saveCartToStorage(cart);
  }, [cart]);

  /* ========== Calculate total ========== */

  useEffect(() => {
    const newTotal = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
    setTotal(newTotal);
  }, [cart.items]);

  /* ========== Add to cart ========== */

  const addToCart = useCallback(
    async (product: any) => {
      try {
        setError(null);

        const newItem: CartItem = {
          id: generateUUID(),
          cart_id: cart.id,
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          image: sanitizeImage(product.image),
          quantity: 1,
          created_at: new Date().toISOString(),
        };

        // ✅ تحديث محلي فوراً (Optimistic)
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

          return {
            ...prev,
            items: [...prev.items, newItem],
          };
        });

        // 📤 إضافة للقاعدة إن وجدت
        if (user && session && cart.id) {
          try {
            await cartService.addToCart(cart.id, product.id, 1);
          } catch (dbErr) {
            console.warn("Failed to sync add to cart:", dbErr);
            // المحلي كافٍ للعمل
          }
        }
      } catch (err: any) {
        console.error("Add to cart error:", err);
        setError("فشل إضافة المنتج");
      }
    },
    [cart.id, user, session]
  );

  /* ========== Update quantity ========== */

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      try {
        setError(null);

        if (quantity <= 0) {
          await removeFromCart(cartItemId);
          return;
        }

        // ✅ تحديث محلي
        setCart((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === cartItemId ? { ...item, quantity } : item
          ),
        }));

        // 📤 تحديث القاعدة
        if (user && session) {
          try {
            await cartService.updateQuantity(cartItemId, quantity);
          } catch (dbErr) {
            console.warn("Failed to sync quantity update:", dbErr);
          }
        }
      } catch (err: any) {
        console.error("Update quantity error:", err);
        setError("فشل تحديث الكمية");
      }
    },
    [user, session]
  );

  /* ========== Remove from cart ========== */

  const removeFromCart = useCallback(
    async (cartItemId: string) => {
      try {
        setError(null);

        // ✅ حذف محلي
        setCart((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== cartItemId),
        }));

        // 📤 حذف من القاعدة
        if (user && session) {
          try {
            await cartService.removeItem(cartItemId);
          } catch (dbErr) {
            console.warn("Failed to sync remove from cart:", dbErr);
          }
        }
      } catch (err: any) {
        console.error("Remove from cart error:", err);
        setError("فشل حذف المنتج");
      }
    },
    [user, session]
  );

  /* ========== Clear cart ========== */

  const clearCart = useCallback(async () => {
    try {
      setError(null);

      // ✅ مسح محلي
      setCart((prev) => ({
        ...prev,
        items: [],
      }));

      // 📤 مسح من القاعدة
      if (user && session && cart.id) {
        try {
          await cartService.clearCart(cart.id);
        } catch (dbErr) {
          console.warn("Failed to sync clear cart:", dbErr);
        }
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (err: any) {
      console.error("Clear cart error:", err);
      setError("فشل مسح السلة");
    }
  }, [user, session, cart.id]);

  return (
    <CartContext.Provider
      value={{
        cartId: cart.id,
        cartItems: cart.items,
        loading,
        error,
        total,
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

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}