export const STORE_MAINTENANCE = {
  enabled: true,
  startsAt: "2026-11-01T00:12:00+02:00",
  endsAt: "2026-11-03T00:12:00+02:00",
  durationHours: 48,
} as const;

const STARTS_AT_MS = Date.parse(STORE_MAINTENANCE.startsAt);
const ENDS_AT_MS = Date.parse(STORE_MAINTENANCE.endsAt);

export function isStoreMaintenanceActive(at = Date.now()) {
  return (
    STORE_MAINTENANCE.enabled &&
    Number.isFinite(STARTS_AT_MS) &&
    Number.isFinite(ENDS_AT_MS) &&
    at >= STARTS_AT_MS &&
    at < ENDS_AT_MS
  );
}
export function getStoreMaintenanceRemainingMs(at = Date.now()) {
  if (!isStoreMaintenanceActive(at)) return 0;
  return Math.max(0, ENDS_AT_MS - at);
}

export function getStoreMaintenanceRetryAfterSeconds(at = Date.now()) {
  return Math.max(1, Math.ceil(getStoreMaintenanceRemainingMs(at) / 1000));
}

export function getStoreMaintenanceWindowMs() {
  return {
    startsAt: STARTS_AT_MS,
    endsAt: ENDS_AT_MS,
  };
}
