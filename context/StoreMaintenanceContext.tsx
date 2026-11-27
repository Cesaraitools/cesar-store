"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  INACTIVE_STORE_MAINTENANCE,
  MAINTENANCE_FALLBACK_ENDS_AT,
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
  hasHydrated: boolean;
  isMaintenanceActive: boolean;
  remainingMs: number;
  countdown: CountdownParts;
  endsAt: string;
};

const StoreMaintenanceContext = createContext<StoreMaintenanceValue | null>(null);

const INACTIVE_REFRESH_INTERVAL_MS = 5 * 60_000;
const ACTIVE_REFRESH_INTERVAL_MS = 30_000;

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
  const clockOffsetRef = useRef(initialNow - Date.now());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [schedule, setSchedule] = useState<StoreMaintenanceSchedule>(
    initialSchedule ?? INACTIVE_STORE_MAINTENANCE
  );
  const isMaintenanceActive = isStoreMaintenanceActive(schedule, now);
  const remainingMs = getStoreMaintenanceRemainingMs(schedule, now);

  useEffect(() => {
    setHasHydrated(true);
    const updateClock = () => setNow(Date.now() + clockOffsetRef.current);

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
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
          serverNow?: number;
        };
        if (isMounted && payload.schedule) {
          if (typeof payload.serverNow === "number") {
            clockOffsetRef.current = payload.serverNow - Date.now();
          }
          setSchedule(payload.schedule);
          setNow(Date.now() + clockOffsetRef.current);
        }
      } catch {
        // Keep the last known schedule when a background refresh fails.
      }
    };

    // New page loads receive the current schedule from the server. Existing
    // tabs only need a slow background refresh while maintenance is inactive;
    // once it becomes active, poll more frequently so stopping it is reflected
    // quickly without keeping a Function hot every ten seconds all day.
    const refreshInterval = isMaintenanceActive
      ? ACTIVE_REFRESH_INTERVAL_MS
      : INACTIVE_REFRESH_INTERVAL_MS;
    const timer = window.setInterval(refreshSchedule, refreshInterval);
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
  }, [isMaintenanceActive]);

  const value = useMemo<StoreMaintenanceValue>(
    () => ({
      hasHydrated,
      isMaintenanceActive,
      remainingMs,
      countdown: splitCountdown(remainingMs),
      endsAt: schedule.endsAt ?? MAINTENANCE_FALLBACK_ENDS_AT,
    }),
    [hasHydrated, isMaintenanceActive, remainingMs, schedule.endsAt]
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
