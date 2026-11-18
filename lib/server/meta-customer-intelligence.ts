import { CUSTOMER_QUERY_LEXICON } from "../customer-query-lexicon";
import type {
  AutomationCategoryOption,
  AutomationProduct,
} from "./automation-products";

export type MetaAttachmentKind = "image" | "video" | "file" | "audio" | "unknown";
export type MetaReactionTone = "positive" | "negative" | "mixed" | "none";
export type MetaSuggestionConsentDecision = "accept" | "decline" | "none";

export function shouldUseMetaDeterministicProductReply(input: {
  aiUsed: boolean;
  autoReply: string;
  handoffReason?: string | null;
  productsCount: number;
  postProductsCount: number;
}) {
  return (
    !input.aiUsed &&
    input.autoReply === "answer" &&
    !input.handoffReason &&
    input.productsCount > 0 &&
    input.postProductsCount > 0
  );
}

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

function cleanMetaReplyDetail(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateMetaReplyDetail(value: string, maxLength: number) {
  if (value.length <= maxLength) return { text: value, truncated: false };
  if (maxLength < 20) return { text: "", truncated: true };

  const candidate = value.slice(0, maxLength).trim();
  const sentenceBoundary = Math.max(
    candidate.lastIndexOf("."),
    candidate.lastIndexOf("!"),
    candidate.lastIndexOf("؟"),
    candidate.lastIndexOf("؛")
  );
  if (sentenceBoundary >= Math.floor(maxLength * 0.55)) {
    return {
      text: candidate.slice(0, sentenceBoundary + 1).trim(),
      truncated: true,
    };
  }

  const wordBoundary = candidate.lastIndexOf(" ");
  const text = (wordBoundary >= Math.floor(maxLength * 0.55)
    ? candidate.slice(0, wordBoundary)
    : candidate
  ).replace(/[،,:;\-]+$/u, "");
  return { text: `${text}…`, truncated: true };
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
      ? "أهلا بحضرتك يا فندم تفاصيل المنتج كالتالي:"
      : "أهلا بحضرتك يا فندم تفاصيل المنتجات كالتالي:";
  const lines = [heading];

  products.forEach((product, index) => {
    if (index === primaryProductCount) {
      lines.push("", "منتجات أخرى من نفس القسم:");
    }

    const description = cleanMetaReplyDetail(product.description);
    const variants = cleanMetaReplyDetail(product.variantSummary);
    const isPrimaryProduct = index < primaryProductCount;

    lines.push(
      `• ${product.name.trim()}`,
      `السعر: ${formatPrice(product.price)} ${formatCurrency(product.currency)}`,
      `التوفر: ${product.isAvailable === false ? "غير متوفر حاليًا" : "متوفر حاليًا"}`
    );
    if (isPrimaryProduct && description) lines.push(`التفاصيل: ${description}`);
    if (isPrimaryProduct && variants) lines.push(`الخيارات: ${variants}`);
    lines.push(product.productUrl.trim());
  });

  const detailedReply = lines.join("\n");
  if (detailedReply.length <= maxReplyLength) return detailedReply;

  const primaryProducts = products.slice(0, primaryProductCount);
  const relatedProducts = products.slice(primaryProductCount);

  if (primaryProductCount === 1) {
    const product = primaryProducts[0];
    const description = cleanMetaReplyDetail(product.description);
    const variants = truncateMetaReplyDetail(
      cleanMetaReplyDetail(product.variantSummary),
      260
    ).text;
    const fixedLines = [
      heading,
      `• ${product.name.trim()}`,
      `السعر: ${formatPrice(product.price)} ${formatCurrency(product.currency)}`,
      `التوفر: ${product.isAvailable === false ? "غير متوفر حاليًا" : "متوفر حاليًا"}`,
      ...(variants ? [`الخيارات: ${variants}`] : []),
      product.productUrl.trim(),
    ];
    const fullPrimaryReply = [
      heading,
      `• ${product.name.trim()}`,
      `السعر: ${formatPrice(product.price)} ${formatCurrency(product.currency)}`,
      `التوفر: ${product.isAvailable === false ? "غير متوفر حاليًا" : "متوفر حاليًا"}`,
      ...(description ? [`التفاصيل: ${description}`] : []),
      ...(variants ? [`الخيارات: ${variants}`] : []),
      product.productUrl.trim(),
    ].join("\n");
    if (fullPrimaryReply.length <= maxReplyLength) return fullPrimaryReply;

    const fullDetailsNote = "للتفاصيل الكاملة يرجى فتح رابط المنتج.";
    const availableDescriptionLength = Math.max(
      0,
      maxReplyLength -
        fixedLines.join("\n").length -
        fullDetailsNote.length -
        "التفاصيل: ".length -
        4
    );
    const fittedDescription = truncateMetaReplyDetail(
      description,
      availableDescriptionLength
    );
    const primaryLines = [
      heading,
      `• ${product.name.trim()}`,
      `السعر: ${formatPrice(product.price)} ${formatCurrency(product.currency)}`,
      `التوفر: ${product.isAvailable === false ? "غير متوفر حاليًا" : "متوفر حاليًا"}`,
      ...(fittedDescription.text
        ? [`التفاصيل: ${fittedDescription.text}`]
        : []),
      ...(fittedDescription.truncated ? [fullDetailsNote] : []),
      ...(variants ? [`الخيارات: ${variants}`] : []),
      product.productUrl.trim(),
    ];
    const primaryReply = primaryLines.join("\n");
    if (primaryReply.length <= maxReplyLength) return primaryReply;
  }

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

function normalizeMetaReplyChoice(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0625\u0623\u0622\u0627]/g, "ا")
    .replace(/\u0649/g, "ي")
    .replace(/\u0629/g, "ه")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectMetaSuggestionConsent(
  value: string
): MetaSuggestionConsentDecision {
  const normalized = normalizeMetaReplyChoice(value);
  if (!normalized) return "none";

  const accept = new Set([
    "نعم",
    "ايوه",
    "اه",
    "تمام",
    "موافق",
    "اعرض",
    "اعرض الاقسام",
    "عايز اشوف",
    "yes",
    "ok",
    "okay",
  ]);
  const decline = new Set([
    "لا",
    "لا شكرا",
    "مش دلوقتي",
    "مش عايز",
    "no",
    "no thanks",
  ]);

  if (accept.has(normalized)) return "accept";
  if (decline.has(normalized)) return "decline";
  return "none";
}

export function resolveMetaSuggestionCategory(
  value: string,
  categories: AutomationCategoryOption[]
) {
  const normalized = normalizeMetaReplyChoice(value);
  if (!normalized) return null;

  const numericChoice = Number(normalized);
  if (
    Number.isInteger(numericChoice) &&
    numericChoice >= 1 &&
    numericChoice <= categories.length
  ) {
    return categories[numericChoice - 1];
  }

  return (
    categories.find((category) => {
      const categoryValues = [
        category.category,
        category.labelAr,
        category.labelEn,
      ].map(normalizeMetaReplyChoice);
      return categoryValues.some(
        (candidate) =>
          candidate === normalized ||
          (candidate.length >= 4 && normalized.includes(candidate)) ||
          (normalized.length >= 4 && candidate.includes(normalized))
      );
    }) || null
  );
}

function buildCompactPrivateProductLines(products: AutomationProduct[]) {
  return products.flatMap((product) => [
    `• ${product.name.trim().slice(0, 120)}`,
    `السعر: ${formatPrice(product.price)} ${formatCurrency(product.currency)}`,
    product.productUrl.trim(),
  ]);
}

export function buildMetaPrivateSuggestionIntro(products: AutomationProduct[]) {
  const availableProducts = products
    .filter(
      (product) =>
        product.isAvailable &&
        product.name.trim() &&
        product.productUrl.trim() &&
        Number.isFinite(product.price) &&
        product.price > 0
    )
    .slice(0, 3);
  const lines = [
    "يسعدنا ويشرفنا تواصل حضرتك معنا.",
    availableProducts.length
      ? "وفيما يلي مقترحات لمنتجات أخرى من نفس القسم نظن أنها قد تكون مفيدة لحضرتك:"
      : "لا توجد حاليًا بدائل إضافية متاحة من نفس القسم.",
    ...(availableProducts.length
      ? ["", ...buildCompactPrivateProductLines(availableProducts)]
      : []),
    "",
    "هل ترغب في مشاهدة ترشيحات من أقسام أخرى؟ اكتب نعم أو لا.",
  ];

  return lines.join("\n").slice(0, 1850);
}

export function buildMetaSuggestionCategoryMenu(
  categories: AutomationCategoryOption[]
) {
  return [
    "يسعدنا مساعدتك. اختر القسم المطلوب بكتابة الرقم أو اسم القسم:",
    ...categories.map((category, index) => `${index + 1}- ${category.labelAr}`),
    "",
    "يمكنك كتابة «لا شكرًا» لإيقاف الترشيحات.",
  ].join("\n");
}

export function buildMetaSuggestionCategoryProducts(
  category: AutomationCategoryOption,
  products: AutomationProduct[]
) {
  const availableProducts = products
    .filter(
      (product) =>
        product.isAvailable &&
        product.category === category.category &&
        product.name.trim() &&
        product.productUrl.trim() &&
        Number.isFinite(product.price) &&
        product.price > 0
    )
    .slice(0, 3);

  if (!availableProducts.length) {
    return `لا توجد حاليًا ترشيحات إضافية متاحة في قسم ${category.labelAr}. يمكنك اختيار قسم آخر.`;
  }

  return [
    `هذه ترشيحات متاحة من قسم ${category.labelAr}:`,
    "",
    ...buildCompactPrivateProductLines(availableProducts),
    "",
    "يمكنك اختيار قسم آخر بكتابة رقمه أو اسمه، أو كتابة «لا شكرًا» للإنهاء.",
  ]
    .join("\n")
    .slice(0, 1850);
}

export function selectMetaPrivateSuggestionProducts(
  products: AutomationProduct[],
  category: string,
  excludedProductIds: Iterable<string>,
  limit = 3
) {
  const excluded = new Set(excludedProductIds);
  return products
    .filter(
      (product) =>
        product.isAvailable &&
        product.category === category &&
        !excluded.has(product.id) &&
        product.name.trim() &&
        product.productUrl.trim() &&
        Number.isFinite(product.price) &&
        product.price > 0
    )
    .slice(0, Math.max(0, Math.min(limit, 3)));
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
