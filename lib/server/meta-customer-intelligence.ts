import { CUSTOMER_QUERY_LEXICON } from "../customer-query-lexicon";

export type MetaAttachmentKind = "image" | "video" | "file" | "audio" | "unknown";
export type MetaReactionTone = "positive" | "negative" | "mixed" | "none";

export const META_PRIVATE_CONTACT_PUBLIC_ACK =
  "تم التواصل مع حضرتك على الخاص";

type PublicReplyProduct = {
  name: string;
  productUrl: string;
};

type PrivateReplyProduct = PublicReplyProduct & {
  price: number;
  currency?: string | null;
};

function normalizeIntentText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesIntentPhrase(value: string, phrases: readonly string[]) {
  const normalized = normalizeIntentText(value);
  if (!normalized) return false;

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeIntentText(phrase);
    if (!normalizedPhrase) return false;

    if (normalizedPhrase === "كم" || /^[a-z]{1,2}$/i.test(normalizedPhrase)) {
      const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
        "iu"
      ).test(normalized);
    }

    return normalized.includes(normalizedPhrase);
  });
}

export function isMetaPriceQuestion(messageText: string) {
  const normalized = normalizeIntentText(messageText);
  if (!normalized) return false;

  if (includesIntentPhrase(normalized, CUSTOMER_QUERY_LEXICON.price)) {
    return true;
  }

  return /(?:^|[^a-z0-9])h[\s._\-/]*m(?:[^a-z0-9]|$)|how\s*[-_.\/]?\s*much|price|cost|\u0628\s*\u0643\s*\u0627\s*\u0645|\u0628\u0643\u0645|\u0643\u0627\u0645|\u0627\u0644\u0633\u0639\u0631|\u0633\u0639\u0631/u.test(
    normalized
  );
}

export function isMetaPriceOnlyQuestion(messageText: string) {
  if (!isMetaPriceQuestion(messageText)) return false;

  const remaining = normalizeIntentText(messageText)
    .replace(/(?:^|[^a-z0-9])h[\s._\-/]*m(?:[^a-z0-9]|$)/giu, " ")
    .replace(/how\s*[-_.\/]?\s*much(?:\s+is\s+it)?/giu, " ")
    .replace(/\b(?:price|cost)(?:\s+please)?\b/giu, " ")
    .replace(/\u0628\s*\u0643\s*\u0627\s*\u0645|\u0628\u0643\u0645|\u0627\u0644\u0633\u0639\u0631|\u0633\u0639\u0631\u0647\u0627|\u0633\u0639\u0631\u0647|\u0633\u0639\u0631|\u0643\u0627\u0645|\u0643\u0645/gu, " ")
    .replace(/\u0644\u0648\s+\u0633\u0645\u062d\u062a|\u0645\u0646\s+\u0641\u0636\u0644\u0643|\u0627\u0644\u0645\u0646\u062a\u062c|\u062f\u0647|\u062f\u0627|\u062f\u064a|\u062f\u0649|\u0647\u0648|\u0647\u064a/gu, " ")
    .replace(/\b(?:please|pls|this|it)\b/giu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return remaining.length === 0;
}

export function detectMetaReactionTone(value: string): MetaReactionTone {
  const text = value.replace(/[\ufe0e\ufe0f\u200d\s]/gu, "");
  if (!text) return "none";

  const hasPositive = /[❤♥🔥😍🥰😘👏👍💪🎉💯🙏🤩😊☺💚💙💜🧡🤍]/u.test(text);
  const hasNegative = /[😡😠🤬👎😞😔😢😭💔😤]/u.test(text);

  if (hasPositive && hasNegative) return "mixed";
  if (hasPositive) return "positive";
  if (hasNegative) return "negative";
  return "none";
}

export function buildMetaAttachmentMessage(kind: MetaAttachmentKind) {
  switch (kind) {
    case "image":
      return "[أرسل العميل صورة مرفقة بدون نص]";
    case "video":
      return "[أرسل العميل فيديو مرفقًا بدون نص]";
    case "audio":
      return "[أرسل العميل تسجيلًا صوتيًا بدون نص]";
    case "file":
      return "[أرسل العميل ملفًا مرفقًا بدون نص]";
    default:
      return "[أرسل العميل مرفقًا بدون نص]";
  }
}

export function buildMetaReactionFallback(tone: MetaReactionTone) {
  if (tone === "positive") {
    return "شكرًا جدًا لحضرتك على دعمك وثقتك، ونتمنى دائمًا أن نكون عند حسن ظنك ❤️";
  }

  if (tone === "negative" || tone === "mixed") {
    return "نأسف إن المنشور لم ينل إعجاب حضرتك. ممكن توضح لنا ما الذي لم يعجبك؟ رأيك يهمنا ويساعدنا على التحسين.";
  }

  return "شكرًا لتواصلك مع سيزر ستور. كيف يمكننا مساعدة حضرتك؟";
}

export function buildMetaPublicProductFallback(input: {
  products: PublicReplyProduct[];
  shopUrl: string;
  categoryUrl?: string;
  priceInquiry: boolean;
  privatePriceSent: boolean;
}) {
  const products = input.products.filter(
    (product) => product.name.trim() && product.productUrl.trim()
  );

  if (!products.length) {
    return "من فضلك وضّح اسم المنتج أو أرسل صورته حتى نساعد حضرتك بدقة.";
  }

  const lines = [
    input.priceInquiry ? "تفاصيل المنتج المطلوب:" : "المنتجات الأقرب لطلب حضرتك:",
    ...products.slice(0, 3).flatMap((product) => [
      product.name.trim(),
      product.productUrl.trim(),
    ]),
  ];

  if (input.categoryUrl) lines.push(input.categoryUrl);
  if (input.shopUrl) lines.push(input.shopUrl);

  if (input.priceInquiry) {
    lines.push(
      input.privatePriceSent
        ? "تم إرسال تفاصيل السعر لحضرتك على ماسنجر."
        : "تفاصيل السعر متاحة عبر ماسنجر الصفحة."
    );
  }

  return lines.join("\n");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatCurrency(value: string | null | undefined) {
  const currency = (value || "EGP").trim().toUpperCase();
  return currency === "EGP" ? "جنيه" : currency;
}

export function buildMetaPrivatePriceFallback(products: PrivateReplyProduct[]) {
  const pricedProducts = products.filter(
    (product) =>
      product.name.trim() &&
      product.productUrl.trim() &&
      Number.isFinite(product.price) &&
      product.price > 0
  );

  if (!pricedProducts.length) return "";

  return [
    "أهلًا بحضرتك، تفاصيل السعر:",
    ...pricedProducts.slice(0, 3).flatMap((product) => [
      `• ${product.name.trim()}: ${formatPrice(product.price)} ${formatCurrency(
        product.currency
      )}`,
      product.productUrl.trim(),
    ]),
  ].join("\n");
}

export function shouldSendMetaPrivatePriceReply(input: {
  priceInquiry: boolean;
  aiUsed: boolean;
  autoReply: string;
  productPrices: number[];
}) {
  return (
    input.priceInquiry &&
    input.aiUsed &&
    input.autoReply === "answer" &&
    input.productPrices.some(
      (price) => Number.isFinite(price) && Number(price) > 0
    )
  );
}
