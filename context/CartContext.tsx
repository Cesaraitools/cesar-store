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
/* ---------------- Types ---------------- */

export type CartItem = {
id: string;
cart_id: string;
product_id: string;
stock?: number;
// ✅ الجديد
name_ar?: string;
name_en?: string;

// ✅ القديم (لعدم كسر UI)
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
const isMerging = useRef(false);
// ✅ FIX: يتذكر آخر userId اتعمله merge — يمنع إعادة الـ merge عند تجديد الـ session
const mergedForUserId = useRef<string | null>(null);

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

/* ---------- DB Cart ---------- */
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
} catch (err) {
  console.warn("Cart init failed");
  hasSyncedWithApi.current = false;
}

};

/* ---------- Merge Logic ---------- */
useEffect(() => {
if (!user || !session) return;
if (isMerging.current) return;

// ✅ FIX: لو عملنا merge لنفس المستخدم قبل كده → لا تعيد الـ merge
// هذا يمنع تكرار الـ merge عند تجديد الـ session تلقائياً
if (mergedForUserId.current === user.id) return;

const mergeCart = async () => {
  try {
    isMerging.current = true;
    mergedForUserId.current = user.id;

    // 🔥 STEP 1: merge local → DB
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

    // 🔥 STEP 2: fetch updated DB items
    const itemsRes = await fetch("/api/cart/items", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const itemsData = await itemsRes.json();
    const dbItems = itemsData?.items || [];

    // ✅ FIX: لو DB رجّع فاضي وعندنا items محلية → لا تعمل overwrite
    if (dbItems.length === 0 && cart.items.length > 0) {
      isMerging.current = false;
      return;
    }

    // 🔥 STEP 3: replace local cart with DB
    setCart((prev) => ({
      ...prev,
      items: dbItems.map((item: any) => ({
        id: item.id,
        cart_id: item.cart_id,
        product_id: item.product_id,

        // ✅ الجديد
        name_ar: item.name_ar || item.name || "",
        name_en: item.name_en || item.name || "",

        // ✅ fallback قديم
        name: item.name || item.name_en || item.name_ar || "Product",

        price: Number(item.price || 0),
        image: item.image || null,
        quantity: item.quantity,
        stock: item.stock || 0,
        created_at: item.created_at,
      })),
    }));

  } catch {
    // silent fail
    isMerging.current = false;
  }
};

mergeCart();

}, [user, session]);

/* ---------------- Actions ---------------- */

const addToCart = (product: any) => {
ensureCartExistsInDb();

setCart((prev) => {
  const existing = prev.items.find(
    (item) => item.product_id === product.id
  );

  if (existing) {
    toast.error("المنتج موجود بالفعل في السلة");
  return prev;
}

  const newItem: CartItem = {
    id: generateUUID(),
    cart_id: prev.id,
    product_id: product.id,

    // ✅ دعم الجديد
    name_ar: product.name_ar || product.name || "",
    name_en: product.name_en || product.name || "",

    // ✅ القديم fallback
    name: product.name || product.name_en || product.name_ar || "Product",

    price: Number(product.price),
    image: sanitizeImage(product.image),
    quantity: 1,
    stock: product.stock,
    created_at: new Date().toISOString(),
  };

  if (user && session) {
  const syncWithDb = async () => {
    try {
      await fetch("/api/cart/items", {
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
    } catch (err) {
      console.warn("Cart sync failed (POST)");
    }
  };

  syncWithDb();
}

  return {
    ...prev,
    items: [...prev.items, newItem],
  };
});

};

const updateQuantity = (cartItemId: string, quantity: number) => {
setCart((prev) => {
  const item = prev.items.find((i) => i.id === cartItemId);
  if (!item) return prev;

  const maxStock = item.stock || 0;

  if (quantity > maxStock) {
    toast.error("الكمية المطلوبة غير متاحة في المخزون");
    return prev;
  }
  if (item && user && session) {
  const syncWithDb = async () => {
    try {
      await fetch("/api/cart/items", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          product_id: item.product_id,
          quantity,
        }),
      });
    } catch (err) {
      console.warn("Cart sync failed (PATCH)");
    }
  };

  syncWithDb();
}

  return {
    ...prev,
    items: prev.items.map((item) =>
      item.id === cartItemId ? { ...item, quantity } : item
    ),
  };
});

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
    } catch (err) {
      console.warn("Cart sync failed (DELETE)");
    }
  };

  syncWithDb();
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

/* ---------------- Hook ---------------- */

export function useCart() {
const context = useContext(CartContext);
if (!context) {
throw new Error("useCart must be used within CartProvider");
}
return context;
}
