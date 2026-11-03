import {
  countVisibleAdminErrors,
  parseDismissedAdminErrorIds,
} from "../lib/admin/error-notifications";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const errors = [{ id: "one" }, { id: "two" }, { id: "three" }];

assert(
  countVisibleAdminErrors(errors, []) === 3,
  "All issues should count when none are dismissed."
);
assert(
  countVisibleAdminErrors(errors, ["two"]) === 2,
  "Dismissed issues should not count."
);
assert(
  countVisibleAdminErrors(errors, ["missing"]) === 3,
  "Unknown dismissed ids should not affect the count."
);
assert(
  parseDismissedAdminErrorIds('["one","one",42,"two"]')
    .join(",") === "one,two",
  "Stored ids should be strings and deduplicated."
);
assert(
  parseDismissedAdminErrorIds("not-json").length === 0,
  "Invalid storage should safely return an empty list."
);

console.log("Admin error count verification passed.");
