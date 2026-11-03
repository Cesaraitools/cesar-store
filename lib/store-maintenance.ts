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

export const MAINTENANCE_FALLBACK_ENDS_AT = "1970-01-01T00:00:00.000Z";
export const MAX_MAINTENANCE_DURATION_MINUTES = 30 * 24 * 60;

const ARABIC_INDIC_DIGITS = [
  "٠",
  "١",
  "٢",
  "٣",
  "٤",
  "٥",
  "٦",
  "٧",
  "٨",
  "٩",
];

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

export function validateStoreMaintenanceDuration(
  hours: number,
  minutes: number
) {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error("يجب إدخال الساعات والدقائق كأرقام صحيحة.");
  }

  if (hours < 0 || minutes < 0 || minutes > 59) {
    throw new Error("أدخل ساعات موجبة ودقائق من 0 إلى 59.");
  }

  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes < 1) {
    throw new Error("أقل مدة مسموحة هي دقيقة واحدة.");
  }

  if (totalMinutes > MAX_MAINTENANCE_DURATION_MINUTES) {
    throw new Error("أقصى مدة مسموحة لوضع الصيانة هي 30 يومًا.");
  }

  return totalMinutes;
}

export function formatMaintenanceCountdownUnit(
  value: number,
  lang: "ar" | "en"
) {
  const asciiValue = String(Math.max(0, Math.floor(value))).padStart(2, "0");

  if (lang === "en") return asciiValue;

  return asciiValue.replace(
    /\d/g,
    (digit) => ARABIC_INDIC_DIGITS[Number(digit)]
  );
}

export function formatMaintenanceCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(" : ");
}
