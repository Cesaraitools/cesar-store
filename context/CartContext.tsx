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
const isMerging = useRef(false);

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

/* ---------- NEW: Fetch + Merge DB Cart ---------- */
useEffect(() => {
if (!user || !session) return;
if (isMerging.current) return;

const fetchAndMerge = async () => {
  try {
    const res = await fetch("/api/cart", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();
    const dbCart = data?.cart;

    if (!dbCart) return;

    // fetch items
    const itemsRes = await fetch("/api/cart/items", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const itemsData = await itemsRes.json();
    const dbItems = itemsData?.items || [];

    isMerging.current = true;

    setCart((prev) => {
      const mergedMap = new Map<string, CartItem>();

      // local first
      prev.items.forEach((item) => {
        mergedMap.set(item.product_id, item);
      });

      // db override or add
      dbItems.forEach((item: any) => {
        mergedMap.set(item.product_id, {
          id: item.id,
          cart_id: item.cart_id,
          product_id: item.product_id,
          name: item.name || "Product",
          price: Number(item.price || 0),
          image: item.image || null,
          quantity: item.quantity,
          created_at: item.created_at,
        });
      });

      return {
        ...prev,
        items: Array.from(mergedMap.values()),
      };
    });
  } catch {
    // silent fail
  }
};

fetchAndMerge();

}, [user, session]);

/* ---------------- Actions ---------------- */

const addToCart = (product: any) => {
ensureCartExistsInDb();

setCart((prev) => {
  const existing = prev.items.find(
    (item) => item.product_id === product.id
  );

  if (existing) {
    return prev;
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

  // 🔥 background sync
  if (user && session) {
    fetch("/api/cart/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        product_id: product.id,
        quantity: 1,
      }),
    }).catch(() => {});
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

  if (item && user && session) {
    fetch("/api/cart/items", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        product_id: item.product_id,
        quantity,
      }),
    }).catch(() => {});
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
    fetch("/api/cart/items", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        product_id: item.product_id,
      }),
    }).catch(() => {});
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