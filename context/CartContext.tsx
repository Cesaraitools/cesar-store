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

type CartContextType = {
  cartId: string;
  cartItems: CartItem[];
  addToCart: (product: any) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "cesar_store_cart_v2";

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

function normalizeStockValue(stock?: number): number | null {
  if (typeof stock !== "number" || !Number.isFinite(stock)) return null;
  return Math.max(0, Math.floor(stock));
}

function getStockExceededMessage(available?: number) {
  if (typeof available === "number") {
    return `الكمية المتاحة حاليًا هي ${available} فقط`;
  }

  return "الكمية المطلوبة غير متاحة في المخزون";
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

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();

  const [cart, setCart] = useState<LocalCart>({
    id: "",
    items: [],
  });

  const hasSyncedWithApi = useRef(false);
  const isMerging = useRef(false);
  const mergedForUserId = useRef<string | null>(null);

  useEffect(() => {
    const stored = loadCartFromStorage();
    setCart(stored);
  }, []);

  useEffect(() => {
    if (!cart.id) return;
    saveCartToStorage(cart);
  }, [cart]);

  const ensureCartExistsInDb = async () => {
    if (!user || !session || hasSyncedWithApi.current) return;

    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      hasSyncedWithApi.current = true;
    } catch {
      console.warn("Cart init failed");
      hasSyncedWithApi.current = false;
    }
  };

  useEffect(() => {
    if (!user || !session) return;
    if (isMerging.current) return;
    if (mergedForUserId.current === user.id) return;

    const mergeCart = async () => {
      try {
        isMerging.current = true;
        mergedForUserId.current = user.id;

        if (cart.items.length > 0) {
          await fetch("/api/cart/merge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              items: cart.items.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
              })),
            }),
          });
        }

        const itemsRes = await fetch("/api/cart/items", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const itemsData = await itemsRes.json();
        const dbItems = itemsData?.items || [];

        if (dbItems.length === 0 && cart.items.length > 0) {
          isMerging.current = false;
          return;
        }

        setCart((prev) => ({
          ...prev,
          items: dbItems.map((item: any) => ({
            id: item.id,
            cart_id: item.cart_id,
            product_id: item.product_id,
            name_ar: item.name_ar || item.name || "",
            name_en: item.name_en || item.name || "",
            name: item.name || item.name_en || item.name_ar || "Product",
            price: Number(item.price || 0),
            image: item.image || null,
            quantity: item.quantity,
            stock: normalizeStockValue(item.stock) ?? 0,
            created_at: item.created_at,
          })),
        }));
        isMerging.current = false;
      } catch {
        isMerging.current = false;
      }
    };

    mergeCart();
  }, [user, session, cart.items]);

  const addToCart = (product: any) => {
    void ensureCartExistsInDb();

    const productStock = normalizeStockValue(product.stock);

    if (productStock !== null && productStock <= 0) {
      toast.error("هذا المنتج غير متوفر حاليًا");
      return;
    }

    const existing = cart.items.find((item) => item.product_id === product.id);
    if (existing) {
      toast.error("المنتج موجود بالفعل في السلة");
      return;
    }

    const newItem: CartItem = {
      id: generateUUID(),
      cart_id: cart.id,
      product_id: product.id,
      name_ar: product.name_ar || product.name || "",
      name_en: product.name_en || product.name || "",
      name: product.name || product.name_en || product.name_ar || "Product",
      price: Number(product.price),
      image: sanitizeImage(product.image),
      quantity: 1,
      stock: productStock ?? undefined,
      created_at: new Date().toISOString(),
    };

    setCart((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    if (user && session) {
      const syncWithDb = async () => {
        try {
          const response = await fetch("/api/cart/items", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              product_id: product.id,
              quantity: 1,
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            toast.error(getStockExceededMessage(payload?.available));

            setCart((current) => ({
              ...current,
              items: current.items.filter(
                (item) => item.product_id !== product.id
              ),
            }));
          }
        } catch {
          console.warn("Cart sync failed (POST)");
        }
      };

      void syncWithDb();
    }
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    const normalizedQuantity = Math.max(1, Math.floor(quantity));
    const item = cart.items.find((cartItem) => cartItem.id === cartItemId);

    if (!item) return;

    const knownStock = normalizeStockValue(item.stock);
    const isIncrease = normalizedQuantity > item.quantity;

    if (isIncrease && knownStock !== null && normalizedQuantity > knownStock) {
      toast.error(getStockExceededMessage(knownStock));
      return;
    }

    if (isIncrease && knownStock === null) {
      toast.error("تعذر التحقق من المخزون الحالي لهذا المنتج");
      return;
    }

    const applyLocalUpdate = (nextStock?: number) => {
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((cartItem) =>
          cartItem.id === cartItemId
            ? {
                ...cartItem,
                quantity: normalizedQuantity,
                ...(typeof nextStock === "number"
                  ? { stock: nextStock }
                  : {}),
              }
            : cartItem
        ),
      }));
    };

    if (user && session) {
      const syncWithDb = async () => {
        try {
          const response = await fetch("/api/cart/items", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              product_id: item.product_id,
              quantity: normalizedQuantity,
            }),
          });

          const payload = await response.json().catch(() => null);

          if (!response.ok) {
            if (typeof payload?.available === "number") {
              setCart((prev) => ({
                ...prev,
                items: prev.items.map((cartItem) =>
                  cartItem.id === cartItemId
                    ? { ...cartItem, stock: payload.available }
                    : cartItem
                ),
              }));
            }

            toast.error(
              getStockExceededMessage(
                typeof payload?.available === "number"
                  ? payload.available
                  : knownStock ?? undefined
              )
            );
            return;
          }

          applyLocalUpdate(
            typeof payload?.available === "number"
              ? payload.available
              : knownStock ?? undefined
          );
        } catch {
          console.warn("Cart sync failed (PATCH)");
        }
      };

      void syncWithDb();
      return;
    }

    applyLocalUpdate(knownStock ?? undefined);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const item = prev.items.find((i) => i.id === cartItemId);

      if (item && user && session) {
        const syncWithDb = async () => {
          try {
            await fetch("/api/cart/items", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                product_id: item.product_id,
              }),
            });
          } catch {
            console.warn("Cart sync failed (DELETE)");
          }
        };

        void syncWithDb();
      }

      return {
        ...prev,
        items: prev.items.filter((i) => i.id !== cartItemId),
      };
    });
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

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
