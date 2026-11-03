export const DISMISSED_ERRORS_STORAGE_KEY =
  "cesar-admin-dismissed-error-ids";
export const ADMIN_ERROR_COUNT_EVENT = "cesar-admin-error-count";

export function parseDismissedAdminErrorIds(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(parsed.filter((id): id is string => typeof id === "string"))
    );
  } catch {
    return [];
  }
}

export function countVisibleAdminErrors(
  errors: Array<{ id: string }>,
  dismissedIds: string[]
) {
  if (errors.length === 0) return 0;

  const dismissed = new Set(dismissedIds);
  return errors.reduce(
    (count, error) => count + (dismissed.has(error.id) ? 0 : 1),
    0
  );
}
