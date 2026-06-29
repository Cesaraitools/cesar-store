"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { WholesaleCartItem, WholesaleCatalogProduct } from "@/types/wholesale";
import type { ProductVariantSnapshot } from "@/types/product";

type WholesaleCartContextType = {
  items: WholesaleCartItem[];
  itemCount: number;
  totalUnits: number;
  addItem: (
    product: WholesaleCatalogProduct,
    orderedUnits: number,
    options?: { variantKey?: string; variant?: ProductVariantSnapshot | null }
  ) => void;
  updateItem: (
    productId: string,
    orderedUnits: number,
    options?: { variantKey?: string }
  ) => void;
  removeItem: (productId: string, options?: { variantKey?: string }) => void;
  replaceItems: (items: WholesaleCartItem[]) => void;
  clearCart: () => void;
  resetCartView: () => void;
};

const WholesaleCartContext = createContext<WholesaleCartContextType | null>(null);

function normalizeCartItems(input: unknown): WholesaleCartItem[] {
  if (!Array.isArray(input)) return [];

  const merged = new Map<string, WholesaleCartItem>();

  for (const rawItem of input) {
    const productId = String((rawItem as WholesaleCartItem)?.productId || "").trim();
    const variantKey = String((rawItem as WholesaleCartItem)?.variantKey || "").trim();
    const variant = (rawItem as WholesaleCartItem)?.variant || null;
    const orderedUnits = Math.max(
      1,
      Math.floor(Number((rawItem as WholesaleCartItem)?.orderedUnits || 1))
    );

    if (!productId) continue;

    const itemKey = `${productId}::${variantKey}`;
    const existing = merged.get(itemKey);
    merged.set(itemKey, {
      productId,
      variantKey,
      variant: variant || existing?.variant || null,
      orderedUnits: (existing?.orderedUnits || 0) + orderedUnits,
    });
  }

  return Array.from(merged.values());
}

function getSafeUnits(value: number) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function getProductName(product: WholesaleCatalogProduct) {
  return product.name.ar || product.name.en || "هذا المنتج";
}

function showWholesaleCartToast(message: string) {
  toast.success(message, {
    duration: 3000,
    style: {
      direction: "rtl",
      background: "rgba(15, 23, 42, 0.96)",
      color: "#fff",
      border: "1px solid rgba(255, 255, 255, 0.14)",
      borderRadius: "18px",
      boxShadow: "0 22px 60px rgba(15, 23, 42, 0.28)",
      fontWeight: 800,
      padding: "14px 18px",
    },
    iconTheme: {
      primary: "#22c55e",
      secondary: "#ffffff",
    },
  });
}

async function readPayload(response: Response) {
  return response.json().catch(() => null) as Promise<{
    items?: WholesaleCartItem[];
    error?: string;
  } | null>;
}

export function WholesaleCartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [items, setItems] = useState<WholesaleCartItem[]>([]);
  const isWholesaleArea = pathname.startsWith("/wholesale");

  const applyPayloadItems = useCallback((payloadItems: unknown) => {
    setItems(normalizeCartItems(payloadItems));
  }, []);

  const refreshCart = useCallback(async () => {
    if (authLoading) return;

    if (!isWholesaleArea || !user?.id) {
      setItems([]);
      return;
    }

    try {
      const response = await fetch("/api/wholesale/cart", { cache: "no-store" });
      const payload = await readPayload(response);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل سلة الجملة");
      }

      const dbItems = normalizeCartItems(payload?.items);
      setItems(dbItems);
    } catch (error) {
      console.warn("Wholesale cart refresh failed", error);
      setItems([]);
    }
  }, [applyPayloadItems, authLoading, isWholesaleArea, user?.id]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    (
      product: WholesaleCatalogProduct,
      orderedUnits: number,
      options?: { variantKey?: string; variant?: ProductVariantSnapshot | null }
    ) => {
      const safeUnits = getSafeUnits(orderedUnits);
      const minimumUnits = Math.max(1, product.minOrderUnits || 1);
      const productName = getProductName(product);
      const variantKey = String(options?.variantKey || "").trim();
      const hasVariants = Boolean(product.variantOptions?.length && product.variants?.length);

      if (!user?.id) {
        toast.error("يجب تسجيل الدخول بحساب جملة مفعل قبل إضافة المنتجات");
        return;
      }

      if (!product.priceVisible || !product.wholesalePrice || product.wholesalePrice <= 0) {
        toast.error("سعر الجملة غير متاح لهذا المنتج حاليا");
        return;
      }

      if (safeUnits < minimumUnits && !(hasVariants && variantKey)) {
        toast.error(`أقل كمية شراء للمنتج "${productName}" هي ${minimumUnits} قطعة`);
        return;
      }

      if (product.stock <= 0 || safeUnits > product.stock) {
        toast.error(`الكمية المطلوبة من "${productName}" غير متاحة حاليا`);
        return;
      }

      const sync = async () => {
        try {
          const response = await fetch("/api/wholesale/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              orderedUnits: safeUnits,
              variantKey,
              variant: options?.variant || null,
            }),
          });
          const payload = await readPayload(response);

          if (!response.ok) {
            throw new Error(payload?.error || "تعذر إضافة الصنف لسلة الجملة");
          }

          applyPayloadItems(payload?.items);
          showWholesaleCartToast("تم تحديث سلة طلب الجملة");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "تعذر إضافة الصنف لسلة الجملة"
          );
        }
      };

      void sync();
    },
    [applyPayloadItems, user?.id]
  );

  const updateItem = useCallback(
    (
      productId: string,
      orderedUnits: number,
      options?: { variantKey?: string }
    ) => {
      const sync = async () => {
        try {
          const response = await fetch("/api/wholesale/cart", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              orderedUnits: getSafeUnits(orderedUnits),
              variantKey: options?.variantKey || "",
            }),
          });
          const payload = await readPayload(response);

          if (!response.ok) {
            throw new Error(payload?.error || "تعذر تحديث سلة الجملة");
          }

          applyPayloadItems(payload?.items);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "تعذر تحديث سلة الجملة"
          );
          void refreshCart();
        }
      };

      void sync();
    },
    [applyPayloadItems, refreshCart]
  );

  const removeItem = useCallback(
    (productId: string, options?: { variantKey?: string }) => {
      const sync = async () => {
        try {
          const response = await fetch("/api/wholesale/cart", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, variantKey: options?.variantKey || "" }),
          });
          const payload = await readPayload(response);

          if (!response.ok) {
            throw new Error(payload?.error || "تعذر حذف الصنف من سلة الجملة");
          }

          applyPayloadItems(payload?.items);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "تعذر حذف الصنف من سلة الجملة"
          );
          void refreshCart();
        }
      };

      void sync();
    },
    [applyPayloadItems, refreshCart]
  );

  const replaceItems = useCallback(
    (nextItems: WholesaleCartItem[]) => {
      const sync = async () => {
        try {
          const response = await fetch("/api/wholesale/cart", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: normalizeCartItems(nextItems) }),
          });
          const payload = await readPayload(response);

          if (!response.ok) {
            throw new Error(payload?.error || "تعذر تحديث سلة الجملة");
          }

          applyPayloadItems(payload?.items);
        } catch (error) {
          console.warn("Wholesale cart replace failed", error);
          void refreshCart();
        }
      };

      void sync();
    },
    [applyPayloadItems, refreshCart]
  );

  const clearCart = useCallback(() => {
    const sync = async () => {
      try {
        const response = await fetch("/api/wholesale/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clear: true }),
        });
        const payload = await readPayload(response);

        if (!response.ok) {
          throw new Error(payload?.error || "تعذر تصفير سلة الجملة");
        }

        applyPayloadItems(payload?.items);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "تعذر تصفير سلة الجملة"
        );
        void refreshCart();
      }
    };

    void sync();
  }, [applyPayloadItems, refreshCart]);

  const resetCartView = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.length,
      totalUnits: items.reduce((total, item) => total + item.orderedUnits, 0),
      addItem,
      updateItem,
      removeItem,
      replaceItems,
      clearCart,
      resetCartView,
    }),
    [addItem, clearCart, items, removeItem, replaceItems, resetCartView, updateItem]
  );

  return (
    <WholesaleCartContext.Provider value={value}>
      {children}
    </WholesaleCartContext.Provider>
  );
}

export function useWholesaleCart() {
  const context = useContext(WholesaleCartContext);

  if (!context) {
    throw new Error("useWholesaleCart must be used within WholesaleCartProvider");
  }

  return context;
}
