"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";

/* ================== Types ================== */

export type OrderStatus =
  | "created"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderTrackingEvent = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note?: string;
  actor: "system" | "admin";
  created_at: string;
};

type OrderTrackingContextType = {
  addEvent: (
    orderId: string,
    status: OrderStatus,
    note?: string,
    actor?: "system" | "admin"
  ) => void;

  getEvents: (orderId: string) => OrderTrackingEvent[];
  getCurrentStatus: (orderId: string) => OrderStatus | null;
};

/* ================== Storage ================== */

const TRACKING_STORAGE_KEY = "cesar_store_order_tracking";

/* ================== Helpers ================== */

function generateUUID() {
  return crypto.randomUUID();
}

function loadEvents(): OrderTrackingEvent[] {
  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveEvents(events: OrderTrackingEvent[]) {
  try {
    localStorage.setItem(
      TRACKING_STORAGE_KEY,
      JSON.stringify(events)
    );
  } catch {}
}

/* ================== Context ================== */

const OrderTrackingContext =
  createContext<OrderTrackingContextType | null>(null);

/* ================== Provider ================== */

export function OrderTrackingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const addEvent = (
    orderId: string,
    status: OrderStatus,
    note?: string,
    actor: "system" | "admin" = "system"
  ) => {
    const events = loadEvents();

    const newEvent: OrderTrackingEvent = {
      id: generateUUID(),
      order_id: orderId,
      status,
      note,
      actor,
      created_at: new Date().toISOString(),
    };

    saveEvents([...events, newEvent]);
  };

  const getEvents = (orderId: string) => {
    return loadEvents()
      .filter((e) => e.order_id === orderId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
  };

  const getCurrentStatus = (
    orderId: string
  ): OrderStatus | null => {
    const events = getEvents(orderId);
    if (events.length === 0) return null;
    return events[events.length - 1].status;
  };

  return (
    <OrderTrackingContext.Provider
      value={{
        addEvent,
        getEvents,
        getCurrentStatus,
      }}
    >
      {children}
    </OrderTrackingContext.Provider>
  );
}

/* ================== Hook ================== */

export function useOrderTracking() {
  const ctx = useContext(OrderTrackingContext);
  if (!ctx) {
    throw new Error(
      "useOrderTracking must be used within OrderTrackingProvider"
    );
  }
  return ctx;
}