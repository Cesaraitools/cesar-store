export type StoreMaintenanceSchedule = {
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string | null;
};

export const INACTIVE_STORE_MAINTENANCE: StoreMaintenanceSchedule = {
  enabled: false,
  startsAt: null,
  endsAt: null,
  updatedAt: null,
};

function parseScheduleTime(value: string | null) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

export function isStoreMaintenanceActive(
  schedule: StoreMaintenanceSchedule,
  at = Date.now()
) {
  const startsAt = parseScheduleTime(schedule.startsAt);
  const endsAt = parseScheduleTime(schedule.endsAt);

  return (
    schedule.enabled &&
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    at >= startsAt &&
    at < endsAt
  );
}

export function getStoreMaintenanceRemainingMs(
  schedule: StoreMaintenanceSchedule,
  at = Date.now()
) {
  if (!isStoreMaintenanceActive(schedule, at)) return 0;
  return Math.max(0, parseScheduleTime(schedule.endsAt) - at);
}

export function getStoreMaintenanceRetryAfterSeconds(
  schedule: StoreMaintenanceSchedule,
  at = Date.now()
) {
  return Math.max(
    1,
    Math.ceil(getStoreMaintenanceRemainingMs(schedule, at) / 1000)
  );
}

export function getStoreMaintenanceDurationMinutes(
  schedule: StoreMaintenanceSchedule
) {
  const startsAt = parseScheduleTime(schedule.startsAt);
  const endsAt = parseScheduleTime(schedule.endsAt);

  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return 0;
  return Math.max(0, Math.round((endsAt - startsAt) / 60_000));
}
