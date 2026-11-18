import assert from "node:assert/strict";
import {
  buildMetaPublicProductFallback,
  detectMetaReactionTone,
  isMetaPriceQuestion,
  prioritizeMetaPostProducts,
} from "../lib/server/meta-customer-intelligence";
import {
  buildMetaPostIdCandidates,
  extractProductIdsFromMetaPostContext,
} from "../lib/server/meta-post-products";
import { validateMetaPublicReply } from "../lib/server/meta-reply-safety";

const priceQuestions = [
  "بكام؟",
  "H.M",
  "hm",
  "h m",
  "h-m",
  "h/m",
  "HowMuch",
  "price please",
];

for (const message of priceQuestions) {
  assert.equal(
    isMetaPriceQuestion(message),
    true,
    `Expected price intent for ${message}`
  );
}

assert.equal(isMetaPriceQuestion("جامد جدًا 🔥"), false);
assert.equal(isMetaPriceQuestion("شكرًا لكم"), false);
assert.equal(detectMetaReactionTone("❤️🔥"), "positive");
assert.equal(detectMetaReactionTone("😡👎"), "negative");
assert.equal(detectMetaReactionTone("❤️😡"), "mixed");
assert.equal(detectMetaReactionTone("بكام؟"), "none");

const primaryId = "11111111-1111-4111-8111-111111111111";
const secondPrimaryId = "22222222-2222-4222-8222-222222222222";
const relatedId = "33333333-3333-4333-8333-333333333333";
const wrongCategoryId = "44444444-4444-4444-8444-444444444444";
const products = [
  {
    id: relatedId,
    name: "منفاخ هواء من نفس القسم",
    productUrl: `https://www.cesareshop.com/product/${relatedId}`,
    price: 600,
    currency: "EGP",
    category: "equipment",
    description: "منفاخ للاستخدام وقت الطوارئ.",
    variantSummary: "",
    isAvailable: true,
  },
  {
    id: wrongCategoryId,
    name: "منتج من قسم مختلف",
    productUrl: `https://www.cesareshop.com/product/${wrongCategoryId}`,
    price: 450,
    currency: "EGP",
    category: "detergent",
    description: "يجب ألا يظهر ضمن الاقتراحات.",
    variantSummary: "",
    isAvailable: true,
  },
  {
    id: secondPrimaryId,
    name: "كابل بطارية موجود في المنشور",
    productUrl: `https://www.cesareshop.com/product/${secondPrimaryId}`,
    price: 350,
    currency: "EGP",
    category: "equipment",
    description: "كابل بطارية للطوارئ.",
    variantSummary: "",
    isAvailable: true,
  },
  {
    id: primaryId,
    name: "كمبروسر موجود في المنشور",
    productUrl: `https://www.cesareshop.com/product/${primaryId}`,
    price: 750,
    currency: "EGP",
    category: "equipment",
    description: "كمبروسر ثنائي الأسطوانة.",
    variantSummary: "النوع: 2 بستم",
    isAvailable: true,
  },
];

const ordered = prioritizeMetaPostProducts(
  products,
  [primaryId, secondPrimaryId],
  2
);
assert.deepEqual(
  ordered.map((product) => product.id),
  [primaryId, secondPrimaryId, relatedId],
  "Post products must be first in their recorded order, followed only by same-category products"
);

const publicReply = buildMetaPublicProductFallback({
  products: ordered,
  primaryProductCount: 2,
});
const allowedUrls = ordered.map((product) => product.productUrl);
const allowedPrices = ordered.map((product) => product.price);

assert.match(publicReply, /750|٧٥٠/u);
assert.match(publicReply, /350|٣٥٠/u);
assert.match(publicReply, /جنيه/u);
assert.equal(publicReply.includes("تم التواصل"), false);
assert.equal(publicReply.includes("الخاص"), false);
assert.equal(publicReply.includes(wrongCategoryId), false);
assert.ok(
  publicReply.indexOf(primaryId) < publicReply.indexOf("منتجات أخرى من نفس القسم"),
  "Related products must appear after the post products"
);
assert.deepEqual(
  validateMetaPublicReply(publicReply, allowedUrls, allowedPrices),
  { safe: true, reason: "ok" }
);
assert.deepEqual(
  validateMetaPublicReply(
    `السعر: 999 جنيه\n${products[3].productUrl}`,
    allowedUrls,
    allowedPrices
  ),
  { safe: false, reason: "public_price_detected" }
);

const crowdedPostProducts = Array.from({ length: 10 }, (_, index) => ({
  id: `crowded-${index + 1}`,
  name: `منتج المنشور رقم ${index + 1} ${"بتفاصيل طويلة ".repeat(15)}`,
  productUrl: `https://www.cesareshop.com/product/crowded-${index + 1}`,
  price: 100 + index,
  currency: "EGP",
  category: "العدد والأدوات",
  description: "وصف طويل ".repeat(50),
  variantSummary: "خيارات متعددة ".repeat(30),
  isAvailable: true,
}));
const crowdedReply = buildMetaPublicProductFallback({
  products: crowdedPostProducts,
  primaryProductCount: crowdedPostProducts.length,
});
assert.ok(crowdedReply.length <= 1850, "Public reply must fit Meta's safe reply budget");
crowdedPostProducts.forEach((product) => {
  assert.ok(
    crowdedReply.includes(`منتج المنشور رقم ${product.id.split("-")[1]}`),
    `Crowded replies must retain primary product ${product.id}`
  );
});
assert.equal(
  crowdedReply.includes("منتجات أخرى من نفس القسم"),
  false,
  "Related suggestions must be dropped before any primary post product"
);

assert.deepEqual(
  buildMetaPostIdCandidates("page-1", "post-1"),
  ["post-1", "page-1_post-1"]
);
assert.deepEqual(
  extractProductIdsFromMetaPostContext(
    `المنتجات:\nhttps://www.cesareshop.com/product/${primaryId}\nhttps://www.cesareshop.com/product/${secondPrimaryId}?utm_source=facebook`
  ),
  [primaryId, secondPrimaryId]
);

console.log("Meta automation rule verification passed");
