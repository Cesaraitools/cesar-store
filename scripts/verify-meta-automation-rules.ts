import assert from "node:assert/strict";
import {
  buildMetaPrivatePriceFallback,
  buildMetaPublicProductFallback,
  detectMetaReactionTone,
  isMetaPriceQuestion,
  shouldSendMetaPrivatePriceReply,
} from "../lib/server/meta-customer-intelligence";
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

assert.equal(
  shouldSendMetaPrivatePriceReply({
    priceInquiry: false,
    aiUsed: true,
    autoReply: "answer",
    productPrices: [750],
  }),
  false,
  "A non-price comment must never trigger a private price message"
);
assert.equal(
  shouldSendMetaPrivatePriceReply({
    priceInquiry: true,
    aiUsed: true,
    autoReply: "answer",
    productPrices: [750],
  }),
  true
);

const products = [
  {
    name: "منفاخ هواء رقمي",
    productUrl: "https://www.cesareshop.com/product/example",
  },
];
const allowedUrls = [
  products[0].productUrl,
  "https://www.cesareshop.com/shop",
];
const publicReply = buildMetaPublicProductFallback({
  products,
  shopUrl: allowedUrls[1],
  priceInquiry: true,
  privatePriceSent: true,
});

assert.equal(publicReply.includes("750"), false);
assert.deepEqual(validateMetaPublicReply(publicReply, allowedUrls), {
  safe: true,
  reason: "ok",
});
assert.deepEqual(
  validateMetaPublicReply(
    `السعر 750 جنيه\n${products[0].productUrl}`,
    allowedUrls,
    [750]
  ),
  { safe: false, reason: "public_price_detected" }
);
assert.deepEqual(
  validateMetaPublicReply(
    `متاح لحضرتك بـ 750\n${products[0].productUrl}`,
    allowedUrls,
    [750]
  ),
  { safe: false, reason: "public_price_detected" }
);

const privateReply = buildMetaPrivatePriceFallback([
  { ...products[0], price: 750, currency: "EGP" },
]);
assert.match(privateReply, /750|٧٥٠/u);
assert.match(privateReply, /جنيه/u);
assert.match(privateReply, /https:\/\/www\.cesareshop\.com\/product\/example/u);

console.log("Meta automation rule verification passed");
