"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
};

const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });

  return (
    <CheckoutContext.Provider value={{ checkoutData, setCheckoutData }}>
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
