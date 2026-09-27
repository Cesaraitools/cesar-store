export type CategoryIdentity = {
  id?: unknown;
  category?: unknown;
  ar?: { title?: unknown } | null;
  en?: { title?: unknown } | null;
};

export type CategoryConflictField = "category" | "arTitle" | "enTitle";

export type CategoryConflict = {
  id: string;
  field: CategoryConflictField;
};

export function normalizeCategorySlug(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}
export function normalizeCategoryTitle(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function findCategoryConflict(
  categories: CategoryIdentity[],
  candidate: CategoryIdentity,
  excludedId?: string
): CategoryConflict | null {
  const candidateSlug = normalizeCategorySlug(candidate.category);
  const candidateArTitle = normalizeCategoryTitle(candidate.ar?.title);
  const candidateEnTitle = normalizeCategoryTitle(candidate.en?.title);

  for (const category of categories) {
    const id = String(category.id ?? "");

    if (excludedId && id === excludedId) {
      continue;
    }

    if (
      candidateSlug &&
      normalizeCategorySlug(category.category) === candidateSlug
    ) {
      return { id, field: "category" };
    }

    if (
      candidateArTitle &&
      normalizeCategoryTitle(category.ar?.title) === candidateArTitle
    ) {
      return { id, field: "arTitle" };
    }

    if (
      candidateEnTitle &&
      normalizeCategoryTitle(category.en?.title) === candidateEnTitle
    ) {
      return { id, field: "enTitle" };
    }
  }

  return null;
}
