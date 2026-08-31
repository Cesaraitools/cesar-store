import assert from "node:assert/strict";

import {
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackViewItem,
} from "../lib/google-ads-tracking";

const metaCalls: unknown[][] = [];
const googleCalls: unknown[][] = [];

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    fbq: (...args: unknown[]) => metaCalls.push(args),
    gtag: (...args: unknown[]) => googleCalls.push(args),
  },
});

const firstProduct = {
  id: "product-uuid-1",
  name_ar: "منتج سيزر الأول",
  price: 125,
  quantity: 2,
  category: "car-care",
};
const secondProduct = {
  product_id: "product-uuid-2",
  name_en: "Second Cesar product",
  price: 75,
  quantity: 1,
};

trackViewItem(firstProduct);
trackAddToCart(firstProduct);
trackBeginCheckout([firstProduct, secondProduct], 325);
trackPurchase({
  transactionId: "order-123",
  value: 325,
  items: [firstProduct, secondProduct],
});

assert.deepEqual(
  metaCalls.map((call) => call[1]),
  ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]
);
assert.deepEqual(
  (metaCalls[0][2] as { content_ids: string[] }).content_ids,
  ["product-uuid-1"]
);
assert.deepEqual(
  (metaCalls[2][2] as { content_ids: string[] }).content_ids,
  ["product-uuid-1", "product-uuid-2"]
);
assert.equal(
  (metaCalls[2][2] as { num_items: number }).num_items,
  3
);
assert.deepEqual(metaCalls[3][3], { eventID: "order-123" });

const metaCountBeforeMissingId = metaCalls.length;
trackViewItem({ name: "Product without a catalog ID", price: 10 });
assert.equal(metaCalls.length, metaCountBeforeMissingId);
assert.ok(googleCalls.length >= 5);

console.log("Meta Pixel ecommerce tracking verification passed.");
