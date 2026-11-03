import assert from "node:assert/strict";

import {
  formatMaintenanceCountdown,
  formatMaintenanceCountdownUnit,
  getStoreMaintenanceDurationMinutes,
  getStoreMaintenanceRemainingMs,
  getStoreMaintenanceRetryAfterSeconds,
  isStoreMaintenanceActive,
  validateStoreMaintenanceDuration,
  type StoreMaintenanceSchedule,
} from "../lib/store-maintenance";

const schedule: StoreMaintenanceSchedule = {
  enabled: true,
  startsAt: "2026-11-03T10:00:00.000Z",
  endsAt: "2026-11-03T12:30:00.000Z",
  updatedAt: "2026-11-03T10:00:00.000Z",
};

const startsAt = Date.parse(schedule.startsAt!);
const endsAt = Date.parse(schedule.endsAt!);

assert.equal(isStoreMaintenanceActive(schedule, startsAt - 1), false);
assert.equal(isStoreMaintenanceActive(schedule, startsAt), true);
assert.equal(isStoreMaintenanceActive(schedule, endsAt - 1), true);
assert.equal(isStoreMaintenanceActive(schedule, endsAt), false);
assert.equal(getStoreMaintenanceRemainingMs(schedule, startsAt), 9_000_000);
assert.equal(getStoreMaintenanceRemainingMs(schedule, endsAt), 0);
assert.equal(getStoreMaintenanceRetryAfterSeconds(schedule, endsAt - 1), 1);
assert.equal(getStoreMaintenanceDurationMinutes(schedule), 150);

assert.equal(formatMaintenanceCountdownUnit(5, "en"), "05");
assert.equal(formatMaintenanceCountdownUnit(5, "ar"), "٠٥");
assert.equal(formatMaintenanceCountdownUnit(720, "ar"), "٧٢٠");
assert.equal(formatMaintenanceCountdown(3_661_000), "01 : 01 : 01");
assert.equal(formatMaintenanceCountdown(0), "00 : 00 : 00");

assert.equal(validateStoreMaintenanceDuration(0, 1), 1);
assert.equal(validateStoreMaintenanceDuration(720, 0), 43_200);
assert.throws(() => validateStoreMaintenanceDuration(0, 0), /دقيقة واحدة/);
assert.throws(() => validateStoreMaintenanceDuration(1, 60), /0 إلى 59/);
assert.throws(() => validateStoreMaintenanceDuration(720, 1), /30 يومًا/);
assert.throws(() => validateStoreMaintenanceDuration(1.5, 0), /أرقام صحيحة/);

assert.equal(
  isStoreMaintenanceActive({ ...schedule, enabled: false }, startsAt),
  false
);
assert.equal(
  isStoreMaintenanceActive({ ...schedule, endsAt: null }, startsAt),
  false
);

console.log("Store maintenance verification passed.");
