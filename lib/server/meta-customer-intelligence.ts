import { CUSTOMER_QUERY_LEXICON } from "../customer-query-lexicon";

export type MetaAttachmentKind = "image" | "video" | "file" | "audio" | "unknown";
export type MetaReactionTone = "positive" | "negative" | "mixed" | "none";

type PublicReplyProduct = {
  id: string;
  name: string;
  productUrl: string;
  price: number;
  currency?: string | null;
  category?: string | null;
  description?: string | null;
  variantSummary?: string | null;
  isAvailable?: boolean;
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
  primaryProductCount: number;
}) {
  const maxReplyLength = 1850;
  const products = input.products.filter(
    (product) =>
      product.name.trim() &&
      product.productUrl.trim() &&
      Number.isFinite(product.price) &&
      product.price > 0
  );

  if (!products.length) {
    return "من فضلك وضّح اسم المنتج أو أرسل صورته حتى نساعد حضرتك بدقة.";
  }

  const primaryProductCount = Math.min(
    Math.max(input.primaryProductCount, 1),
    products.length
  );
  const heading =
    primaryProductCount === 1
      ? "تفاصيل المنتج الموجود في المنشور:"
      : "تفاصيل المنتجات الموجودة في المنشور:";
  const lines = [heading];

  products.forEach((product, index) => {
    if (index === primaryProductCount) {
      lines.push("", "منتجات أخرى من نفس القسم:");
    }

    const description = String(product.description || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    const variants = String(product.variantSummary || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    lines.push(
      `• ${product.name.trim()}`,
      `السعر: ${formatPrice(product.price)} ${formatCurrency(product.currency)}`,
      `التوفر: ${product.isAvailable === false ? "غير متوفر حاليًا" : "متوفر حاليًا"}`
    );
    if (description) lines.push(`التفاصيل: ${description}`);
    if (variants) lines.push(`الخيارات: ${variants}`);
    lines.push(product.productUrl.trim());
  });

  const detailedReply = lines.join("\n");
  if (detailedReply.length <= maxReplyLength) return detailedReply;

  const primaryProducts = products.slice(0, primaryProductCount);
  const relatedProducts = products.slice(primaryProductCount);
  const compactLines = [heading];
  const appendCompactProduct = (product: PublicReplyProduct) => {
    compactLines.push(
      `• ${product.name.trim().slice(0, 110)} — ${formatPrice(product.price)} ${formatCurrency(product.currency)} — ${product.isAvailable === false ? "غير متوفر حاليًا" : "متوفر حاليًا"}`
    );
  };

  primaryProducts.forEach(appendCompactProduct);
  if (relatedProducts.length) {
    compactLines.push("", "منتجات أخرى من نفس القسم:");
    relatedProducts.forEach(appendCompactProduct);
  }

  const compactReply = compactLines.join("\n");
  if (compactReply.length <= maxReplyLength) return compactReply;

  // عند ازدحام المنشور بمنتجات كثيرة، نحذف الاقتراحات أولًا ونحافظ على
  // ذكر كل منتج أساسي وسعره بدل قص الرد في منتصف قائمة منتجات المنشور.
  const availableNameLength = Math.max(
    32,
    Math.min(90, Math.floor((maxReplyLength - heading.length - 160) / primaryProducts.length))
  );
  return [
    heading,
    ...primaryProducts.map(
      (product) =>
        `• ${product.name.trim().slice(0, availableNameLength)} — ${formatPrice(product.price)} ${formatCurrency(product.currency)}`
    ),
  ].join("\n");
}

export function prioritizeMetaPostProducts<
  T extends { id: string; category?: string | null }
>(products: T[], postProductIds: string[], relatedLimit = 2) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const primaryProducts = postProductIds
    .map((id) => byId.get(id))
    .filter((product): product is T => Boolean(product));

  if (!primaryProducts.length) return [];

  const primaryIds = new Set(primaryProducts.map((product) => product.id));
  const primaryCategory = primaryProducts[0].category || "";
  const relatedProducts = products.filter(
    (product) =>
      !primaryIds.has(product.id) &&
      Boolean(primaryCategory) &&
      product.category === primaryCategory
  );

  return [
    ...primaryProducts,
    ...relatedProducts.slice(0, Math.max(relatedLimit, 0)),
  ];
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
