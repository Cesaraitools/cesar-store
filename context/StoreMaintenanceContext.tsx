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
  INACTIVE_STORE_MAINTENANCE,
  getStoreMaintenanceRemainingMs,
  isStoreMaintenanceActive,
  type StoreMaintenanceSchedule,
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
  initialSchedule,
}: {
  children: ReactNode;
  initialNow: number;
  initialSchedule?: StoreMaintenanceSchedule;
}) {
  const [now, setNow] = useState(initialNow);
  const [schedule, setSchedule] = useState<StoreMaintenanceSchedule>(
    initialSchedule ?? INACTIVE_STORE_MAINTENANCE
  );
  const isMaintenanceActive = isStoreMaintenanceActive(schedule, now);
  const remainingMs = getStoreMaintenanceRemainingMs(schedule, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refreshSchedule = async () => {
      try {
        const response = await fetch("/api/store-maintenance", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          schedule?: StoreMaintenanceSchedule;
        };
        if (isMounted && payload.schedule) {
          setSchedule(payload.schedule);
          setNow(Date.now());
        }
      } catch {
        // Keep the last known schedule when a background refresh fails.
      }
    };

    const timer = window.setInterval(refreshSchedule, 10_000);
    const updateClock = () => {
      if (document.visibilityState === "visible") {
        void refreshSchedule();
      }
    };

    document.addEventListener("visibilitychange", updateClock);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  const value = useMemo<StoreMaintenanceValue>(
    () => ({
      isMaintenanceActive,
      remainingMs,
      countdown: splitCountdown(remainingMs),
      endsAt: schedule.endsAt ?? new Date(0).toISOString(),
    }),
    [isMaintenanceActive, remainingMs, schedule.endsAt]
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
