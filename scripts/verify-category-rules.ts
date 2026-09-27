import assert from "node:assert/strict";
import {
  findCategoryConflict,
  normalizeCategorySlug,
  normalizeCategoryTitle,
} from "../lib/category-rules";

const categories = [
  {
    id: "existing",
    category: "car-care",
    ar: { title: "العناية بالسيارة" },
    en: { title: "Car Care" },
  },
];

assert.equal(normalizeCategorySlug("  CAR-CARE  "), "car-care");
assert.equal(normalizeCategoryTitle("  Car   Care  "), "car care");

assert.deepEqual(
  findCategoryConflict(categories, {
    category: " CAR-CARE ",
    ar: { title: "قسم مختلف" },
    en: { title: "Different category" },
  }),
  { id: "existing", field: "category" }
);

assert.deepEqual(
  findCategoryConflict(categories, {
    category: "different-slug",
    ar: { title: "  العناية   بالسيارة " },
    en: { title: "Different category" },
  }),
  { id: "existing", field: "arTitle" }
);

assert.deepEqual(
  findCategoryConflict(categories, {
    category: "different-slug",
    ar: { title: "قسم مختلف" },
    en: { title: " car   care " },
  }),
  { id: "existing", field: "enTitle" }
);

assert.equal(
  findCategoryConflict(
    categories,
    {
      category: "car-care",
      ar: { title: "العناية بالسيارة" },
      en: { title: "Car Care" },
    },
    "existing"
  ),
  null
);

assert.equal(
  findCategoryConflict(categories, {
    category: "new-category",
    ar: { title: "قسم جديد" },
    en: { title: "New Category" },
  }),
  null
);

console.log("Category rules verification passed (5 scenarios).");
