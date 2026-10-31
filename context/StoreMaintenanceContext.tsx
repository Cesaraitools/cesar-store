"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  STORE_MAINTENANCE,
  getStoreMaintenanceRemainingMs,
  getStoreMaintenanceWindowMs,
  isStoreMaintenanceActive,
} from "@/lib/store-maintenance";

type CountdownParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

type StoreMaintenanceValue = {
  isMaintenanceActive: boolean;
  remainingMs: number;
  countdown: CountdownParts;
  endsAt: string;
};

const StoreMaintenanceContext = createContext<StoreMaintenanceValue | null>(null);

function splitCountdown(remainingMs: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
export function StoreMaintenanceProvider({
  children,
  initialNow,
}: {
  children: ReactNode;
  initialNow: number;
}) {
  const [now, setNow] = useState(initialNow);
  const isMaintenanceActive = isStoreMaintenanceActive(now);
  const remainingMs = getStoreMaintenanceRemainingMs(now);

  useEffect(() => {
    const { endsAt } = getStoreMaintenanceWindowMs();
    let timer: number | undefined;
    const updateClock = () => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= endsAt && timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    updateClock();
    if (Date.now() < endsAt) {
      timer = window.setInterval(updateClock, 1000);
    }

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, []);

  const value = useMemo<StoreMaintenanceValue>(
    () => ({
      isMaintenanceActive,
      remainingMs,
      countdown: splitCountdown(remainingMs),
      endsAt: STORE_MAINTENANCE.endsAt,
    }),
    [isMaintenanceActive, remainingMs]
  );

  return (
    <StoreMaintenanceContext.Provider value={value}>
      {children}
    </StoreMaintenanceContext.Provider>
  );
}

export function useStoreMaintenance() {
  const context = useContext(StoreMaintenanceContext);

  if (!context) {
    throw new Error(
      "useStoreMaintenance must be used within StoreMaintenanceProvider"
    );
  }

  return context;
}
