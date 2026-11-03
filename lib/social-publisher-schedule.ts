const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_DAILY_REPETITIONS = 1;
export const MAX_DAILY_REPETITIONS = 10;

export function normalizeDailyRepetitions(value: number) {
  if (!Number.isFinite(value)) return MIN_DAILY_REPETITIONS;

  return Math.min(
    MAX_DAILY_REPETITIONS,
    Math.max(MIN_DAILY_REPETITIONS, Math.trunc(value))
  );
}

export function buildEvenlySpacedSchedule(
  startValue: string | Date,
  repetitionsValue: number
) {
  const start = startValue instanceof Date ? startValue : new Date(startValue);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid schedule start date.");
  }

  const repetitions = normalizeDailyRepetitions(repetitionsValue);
  const intervalMs = DAY_MS / repetitions;

  return Array.from({ length: repetitions }, (_, index) =>
    new Date(start.getTime() + intervalMs * index).toISOString()
  );
}

export function repeatIntervalMinutes(repetitionsValue: number) {
  const repetitions = normalizeDailyRepetitions(repetitionsValue);
  return DAY_MS / repetitions / 60_000;
}
