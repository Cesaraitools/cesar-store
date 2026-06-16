import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { normalizeProductVariantOptions } from "@/lib/product-variants";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export type AutomationLanguage = "ar" | "en";
type AutomationSearchIntent = "product" | "category" | "clarify";
type AutomationReplyAction = "answer" | "clarify" | "handoff";

type ProductRow = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number | string | null;
  image_url: string | null;
  images_json: unknown;
  stock: number | null;
  category: string | null;
  is_active: boolean | null;
  low_stock_threshold: number | null;
  variant_options_json?: unknown;
  variants_json?: unknown;
};

export type AutomationProduct = {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  price: number;
  currency: "EGP";
  category: string;
  productUrl: string;
  imageUrl: string;
  images: string[];
  isAvailable: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  stock: number;
  lowStockThreshold: number;
  variantSummary: string;
};

export type AutomationProductSearchResult = {
  schemaVersion: 1;
  query: string;
  language: AutomationLanguage;
  products: AutomationProduct[];
  suggestedReply: string;
  meta: {
    source: "cesar-store";
    count: number;
    bestScore: number;
    confidence: "high" | "medium" | "low";
    intent: AutomationSearchIntent;
    autoReply: AutomationReplyAction;
    handoffReason: string | null;
    matchedCategory: string | null;
    generatedAt: string;
  };
};

type CategoryIntent = {
  category: string;
  labelAr: string;
  labelEn: string;
  examplesAr: string;
  examplesEn: string;
  variantNoteAr: string;
  variantNoteEn: string;
  keywords: string[];
};

type ClarifyIntent = {
  label: string;
  keywords: string[];
  replyAr: string;
  replyEn: string;
};

type QueryUnderstanding = {
  tokens: string[];
  phrases: string[];
  hasPriceIntent: boolean;
  hasAvailabilityIntent: boolean;
  hasOptionsIntent: boolean;
  needsPostContext: boolean;
  productRequest: boolean;
  humanHandoff: boolean;
};

const MIN_DIRECT_PRODUCT_SCORE = 6;

const QUERY_STOP_WORDS = new Set([
  "عايز",
  "عايزه",
  "عاوز",
  "عاوزه",
  "اريد",
  "محتاج",
  "محتاجه",
  "ممكن",
  "لو",
  "سمحت",
  "من",
  "فضلك",
  "هل",
  "في",
  "فيه",
  "عندكم",
  "عندكو",
  "عندك",
  "للبيع",
  "موجود",
  "متوفر",
  "بكام",
  "بكم",
  "كام",
  "كم",
  "السعر",
  "سعر",
  "سعره",
  "سعرها",
  "ثمن",
  "تكلفة",
  "اختيارات",
  "الوان",
  "ألوان",
  "مقاس",
  "مقاسات",
  "السياره",
  "سياره",
  "للسياره",
  "العربيه",
  "عربيه",
  "للعربيه",
  "car",
  "cars",
  "auto",
  "vehicle",
  "for",
  "the",
  "a",
  "an",
  "do",
  "you",
  "have",
  "need",
  "want",
  "how",
  "much",
  "hm",
  "h",
  "m",
  "price",
  "cost",
  "available",
  "availability",
  "option",
  "options",
  "color",
  "colors",
  "scent",
  "scents",
  "size",
  "sizes",
]);

const CLARIFY_INTENTS: ClarifyIntent[] = [
  {
    label: "seat-covers",
    keywords: [
      "فرش جلد",
      "فرش كراسي",
      "فرش مقاعد",
      "كسوه كراسي",
      "كسوه مقاعد",
      "كسوة كراسي",
      "كسوة مقاعد",
      "تلبيسه كراسي",
      "تلبيسة كراسي",
      "تلبيسات كراسي",
      "غطاء كرسي",
      "اغطيه كراسي",
      "اغطية كراسي",
      "seat cover",
      "seat covers",
      "leather seat",
      "leather seats",
      "leather cover",
      "upholstery",
    ],
    replyAr:
      "حاليا مش ظاهر عندنا فرش جلد او كسوة كراسي ضمن المنتجات المتاحة على الموقع. لو تقصد فرشة تنظيف او اكسسوار داخلي للسيارة، ابعتلي النوع المطلوب وهدور لك على الاقرب.",
    replyEn:
      "I cannot see leather seat covers in the currently available products. If you mean a cleaning brush or an interior accessory, send the exact type and I will find the closest match.",
  },
];

const HUMAN_HANDOFF_PHRASES = [
  "طلب",
  "طلبي",
  "اوردر",
  "اوردري",
  "الشحن",
  "شحن",
  "اتأخر",
  "اتاخرت",
  "استبدال",
  "استرجاع",
  "ارجاع",
  "مرتجع",
  "الغاء",
  "إلغاء",
  "الدفع",
  "دفعت",
  "فلوسي",
  "رقم",
  "تليفون",
  "موبايل",
  "واتساب",
  "whatsapp",
  "phone",
  "order",
  "shipping",
  "delivery",
  "refund",
  "return",
  "exchange",
  "cancel",
  "complaint",
];

const PRODUCT_REQUEST_PHRASES = [
  "عايز",
  "عاوز",
  "اريد",
  "محتاج",
  "عندكم",
  "عندك",
  "متوفر",
  "موجود",
  "بكام",
  "سعر",
  "كام",
  "ايه المتاح",
  "ما هي",
  "what",
  "price",
  "available",
  "need",
  "want",
  "have",
];

const PRICE_INTENT_PHRASES = [
  "بكام",
  "بكم",
  "كام",
  "كم",
  "السعر",
  "سعر",
  "سعره",
  "سعرها",
  "سعرهم",
  "ثمن",
  "ثمنه",
  "تكلفة",
  "h.m",
  "hm",
  "how much",
  "price",
  "cost",
];

const AVAILABILITY_INTENT_PHRASES = [
  "متوفر",
  "موجود",
  "في منه",
  "فيه منه",
  "لسه موجود",
  "available",
  "in stock",
  "stock",
];

const OPTIONS_INTENT_PHRASES = [
  "روايح",
  "روائح",
  "ريحة",
  "رايحة",
  "الوان",
  "ألوان",
  "لون",
  "مقاس",
  "مقاسات",
  "اختيارات",
  "options",
  "option",
  "colors",
  "color",
  "scents",
  "scent",
  "sizes",
  "size",
];

const POST_CONTEXT_ONLY_PHRASES = [
  "بكام",
  "بكم",
  "كام",
  "كم",
  "ده",
  "دا",
  "دي",
  "دول",
  "الصورة",
  "الصور",
  "المنشور",
  "البوست",
  "اللي في الصورة",
  "h.m",
  "hm",
  "how much",
  "this",
];

const CATEGORY_INTENTS: CategoryIntent[] = [
  {
    category: "air-fresheners",
    labelAr: "معطرات السيارات",
    labelEn: "car air fresheners",
    examplesAr: "معطرات ورق، فواحات، ومباخر بروائح مختلفة",
    examplesEn: "hanging fresheners, diffusers, and burners in different scents",
    variantNoteAr: "الروائح بتختلف حسب كل منتج وبراند، فافتح المنتج لاختيار الرائحة المتاحة.",
    variantNoteEn: "Scents vary by product and brand, so open the product to choose the available scent.",
    keywords: [
      "معطر",
      "معطرات",
      "معطرات سيارات",
      "معطر سياره",
      "معطر سيارة",
      "فواحه",
      "فواحة",
      "فواحات",
      "مبخره",
      "مبخرة",
      "مباخر",
      "رائحه",
      "ريحة",
      "روائح",
      "freshener",
      "air freshener",
      "perfume",
      "scent",
    ],
  },
  {
    category: "detergent",
    labelAr: "منظفات السيارات",
    labelEn: "car cleaning products",
    examplesAr: "شامبو، فوم، واكس، ومنظفات داخلية وخارجية",
    examplesEn: "shampoo, foam, wax, and interior or exterior cleaners",
    variantNoteAr: "اختيار المنظف المناسب بيختلف حسب الاستخدام والسطح المطلوب تنظيفه.",
    variantNoteEn: "The right cleaner depends on the surface and use case.",
    keywords: [
      "منظف",
      "منظفات",
      "تنظيف",
      "شامبو",
      "فوم",
      "واكس",
      "بولش",
      "تلميع",
      "تابلوه",
      "cleaner",
      "detergent",
      "shampoo",
      "foam",
      "wax",
      "polish",
    ],
  },
  {
    category: "cars-accessories",
    labelAr: "إكسسوارات السيارات",
    labelEn: "car accessories",
    examplesAr: "باسكت، حوامل، منظمات، مخدات سفر، وإكسسوارات داخلية",
    examplesEn: "bins, holders, organizers, travel pillows, and interior accessories",
    variantNoteAr: "الألوان والمقاسات بتختلف حسب المنتج، فافتح المنتج لاختيار المتاح.",
    variantNoteEn: "Colors and sizes vary by product, so open the product to choose what is available.",
    keywords: [
      "اكسسوار",
      "اكسسوارات",
      "إكسسوار",
      "إكسسوارات",
      "باسكت",
      "سله",
      "سلة",
      "قمامه",
      "قمامة",
      "حامل",
      "منظم",
      "مخده",
      "مخدة",
      "رقبه",
      "رقبة",
      "accessory",
      "accessories",
      "bin",
      "holder",
      "organizer",
    ],
  },
  {
    category: "cars-lights",
    labelAr: "إضاءات السيارات",
    labelEn: "car lights",
    examplesAr: "لمبات وليدات وإضاءات للسيارة",
    examplesEn: "bulbs, LEDs, and car lighting kits",
    variantNoteAr: "راجع نوع السوكت والمقاس المناسب لعربيتك قبل الطلب.",
    variantNoteEn: "Check the socket type and fitment for your car before ordering.",
    keywords: [
      "لمبه",
      "لمبة",
      "لمبات",
      "ليد",
      "إضاءة",
      "اضاءه",
      "اضاءة",
      "نور",
      "كشاف",
      "زينون",
      "led",
      "light",
      "lights",
      "bulb",
    ],
  },
  {
    category: "equipment",
    labelAr: "عدد وأدوات السيارة",
    labelEn: "car tools and equipment",
    examplesAr: "كمبروسر، كابلات بطارية، واير جر، وعدد للطوارئ",
    examplesEn: "compressors, jumper cables, tow cables, and emergency tools",
    variantNoteAr: "استخدم أدوات الطوارئ حسب تعليمات المنتج والعربية.",
    variantNoteEn: "Use emergency tools according to the product and vehicle instructions.",
    keywords: [
      "عده",
      "عدة",
      "اداه",
      "أداة",
      "ادوات",
      "أدوات",
      "معدات",
      "كمبروسر",
      "كومبروسر",
      "منفاخ",
      "كابل",
      "بطاريه",
      "بطارية",
      "واير",
      "جر",
      "tool",
      "tools",
      "equipment",
      "compressor",
      "jumper",
      "tow",
    ],
  },
  {
    category: "additives-fluids",
    labelAr: "سوائل وإضافات السيارة",
    labelEn: "car fluids and additives",
    examplesAr: "إضافات بنزين، منظفات رشاشات، مياه مساحات، وسوائل عناية",
    examplesEn: "fuel additives, injector cleaners, washer fluids, and care fluids",
    variantNoteAr: "راجع تعليمات المنتج ومتطلبات العربية قبل استخدام أي سائل أو إضافة.",
    variantNoteEn: "Check product instructions and vehicle requirements before using any fluid or additive.",
    keywords: [
      "سائل",
      "سوائل",
      "اضافه",
      "إضافة",
      "اضافات",
      "إضافات",
      "زيت",
      "بنزين",
      "اوكتان",
      "أوكتان",
      "رشاشات",
      "مساحات",
      "ردياتير",
      "fluid",
      "fluids",
      "additive",
      "additives",
      "octane",
      "injector",
    ],
  },
];

export function detectAutomationLanguage(
  input: string,
  requested: string | null
): AutomationLanguage {
  if (requested === "ar" || requested === "en") return requested;

  return /[\u0600-\u06ff]/.test(input) ? "ar" : "en";
}

function normalizeSearchText(input: string) {
  return input
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0625\u0623\u0622\u0627]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string) {
  return normalizeSearchText(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function expandTokenForms(token: string) {
  const forms = [token];

  if (token.startsWith("ال") && token.length > 4) {
    forms.push(token.slice(2));
  }

  if (token.endsWith("ات") && token.length > 4) {
    forms.push(token.slice(0, -2));
  }

  if (token.endsWith("ه") && token.length > 3) {
    forms.push(token.slice(0, -1));
  }

  return forms;
}

function meaningfulTokens(input: string) {
  const tokens = tokenize(input).filter((token) => !QUERY_STOP_WORDS.has(token));
  const expanded = tokens.flatMap(expandTokenForms);

  return Array.from(new Set(expanded)).filter((token) => !QUERY_STOP_WORDS.has(token));
}

function detectClarifyIntent(query: string) {
  const normalizedQuery = normalizeSearchText(query);

  return (
    CLARIFY_INTENTS.find((intent) =>
      intent.keywords.some((keyword) => {
        const normalizedKeyword = normalizeSearchText(keyword);

        return (
          normalizedQuery === normalizedKeyword ||
          normalizedQuery.includes(normalizedKeyword)
        );
      })
    ) || null
  );
}

function includesAnyPhrase(query: string, phrases: string[]) {
  const normalizedQuery = normalizeSearchText(query);

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeSearchText(phrase);

    return Boolean(normalizedPhrase) && normalizedQuery.includes(normalizedPhrase);
  });
}

function buildNgrams(tokens: string[], maxLength = 3) {
  const phrases: string[] = [];

  for (let size = 1; size <= maxLength; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      phrases.push(tokens.slice(index, index + size).join(" "));
    }
  }

  return Array.from(new Set(phrases)).filter(Boolean);
}

function shouldHumanHandle(query: string) {
  return includesAnyPhrase(query, HUMAN_HANDOFF_PHRASES);
}

function looksLikeProductRequest(query: string) {
  return includesAnyPhrase(query, PRODUCT_REQUEST_PHRASES) || meaningfulTokens(query).length > 0;
}

function understandQuery(query: string): QueryUnderstanding {
  const tokens = meaningfulTokens(query);
  const phrases = buildNgrams(tokens, 3);
  const hasPriceIntent = includesAnyPhrase(query, PRICE_INTENT_PHRASES);
  const hasAvailabilityIntent = includesAnyPhrase(query, AVAILABILITY_INTENT_PHRASES);
  const hasOptionsIntent = includesAnyPhrase(query, OPTIONS_INTENT_PHRASES);
  const humanHandoff = shouldHumanHandle(query);
  const productRequest =
    hasPriceIntent ||
    hasAvailabilityIntent ||
    hasOptionsIntent ||
    looksLikeProductRequest(query);
  const hasPostOnlyPhrase = includesAnyPhrase(query, POST_CONTEXT_ONLY_PHRASES);
  const needsPostContext =
    !humanHandoff &&
    hasPostOnlyPhrase &&
    tokens.length <= 1 &&
    normalizeSearchText(query).length <= 24;

  return {
    tokens,
    phrases,
    hasPriceIntent,
    hasAvailabilityIntent,
    hasOptionsIntent,
    needsPostContext,
    productRequest,
    humanHandoff,
  };
}

function detectCategoryIntent(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenize(query);
  const tokenSet = new Set(tokens);

  const scored = CATEGORY_INTENTS.map((intent) => {
    const score = intent.keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeSearchText(keyword);
      if (!normalizedKeyword) return total;

      if (normalizedQuery === normalizedKeyword) return total + 6;
      if (tokenSet.has(normalizedKeyword)) return total + 4;
      if (normalizedQuery.includes(normalizedKeyword)) return total + 3;

      return total;
    }, 0);

    return { intent, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score ? scored[0] : null;
}

function isBroadCategoryQuery(query: string, categoryIntent: CategoryIntent | null) {
  if (!categoryIntent) return false;

  const tokens = tokenize(query);
  if (tokens.length <= 4) return true;

  const normalizedQuery = normalizeSearchText(query);
  return categoryIntent.keywords.some((keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword);
    return normalizedQuery === normalizedKeyword;
  });
}

function categoryUrl(category: string, baseUrl: string) {
  const path = `/shop?category=${encodeURIComponent(category)}`;
  if (!baseUrl) return path;

  return absoluteUrl(path, baseUrl);
}

function getProductVariantSearchText(product: ProductRow) {
  const options = normalizeProductVariantOptions(product.variant_options_json);

  return options
    .flatMap((option) => [
      option.name.ar,
      option.name.en,
      ...option.values.flatMap((value) => [value.label.ar, value.label.en]),
    ])
    .filter(Boolean)
    .join(" ");
}

function scoreProduct(
  product: ProductRow,
  query: string,
  understanding: QueryUnderstanding,
  categoryIntent: CategoryIntent | null
) {
  const normalizedQuery = normalizeSearchText(query);
  const { tokens, phrases } = understanding;
  const nameText = normalizeSearchText(
    `${product.name_ar || ""} ${product.name_en || ""}`
  );
  const idText = normalizeSearchText(product.id);
  const descriptionText = normalizeSearchText(
    `${product.description_ar || ""} ${product.description_en || ""}`
  );
  const variantText = normalizeSearchText(getProductVariantSearchText(product));
  const categoryText = normalizeSearchText(normalizeCategory(product.category || ""));
  const haystack = `${idText} ${nameText} ${descriptionText} ${variantText} ${categoryText}`;
  const category = normalizeCategory(product.category || "");

  let score = 0;

  if (idText && normalizedQuery.includes(idText)) score += 20;
  if (normalizedQuery && nameText.includes(normalizedQuery)) score += 12;
  if (normalizedQuery && haystack.includes(normalizedQuery)) score += 4;
  if (categoryIntent?.category === category) score += 10;

  for (const phrase of phrases.filter((item) => item.includes(" "))) {
    if (nameText.includes(phrase)) {
      score += 9;
    } else if (variantText.includes(phrase)) {
      score += 5;
    } else if (descriptionText.includes(phrase)) {
      score += 4;
    } else if (categoryText.includes(phrase)) {
      score += 3;
    }
  }

  let matchedTokens = 0;

  for (const token of tokens) {
    if (nameText.includes(token)) {
      score += 4;
      matchedTokens += 1;
    } else if (descriptionText.includes(token)) {
      score += 2;
      matchedTokens += 1;
    } else if (variantText.includes(token)) {
      score += 2;
      matchedTokens += 1;
    } else if (categoryText.includes(token)) {
      score += 1;
      matchedTokens += 1;
    }
  }

  if (tokens.length && tokens.every((token) => haystack.includes(token))) {
    score += 3;
  }

  if (tokens.length >= 2 && matchedTokens < tokens.length) {
    score -= (tokens.length - matchedTokens) * 4;
  }

  if (Number(product.stock || 0) > 0) score += 1;

  return Math.max(score, 0);
}

function variantSummary(product: ProductRow, language: AutomationLanguage) {
  const options = normalizeProductVariantOptions(product.variant_options_json);
  if (!options.length) return "";

  return options
    .slice(0, 2)
    .map((option) => {
      const optionName = language === "ar" ? option.name.ar : option.name.en;
      const values = option.values
        .slice(0, 4)
        .map((value) => (language === "ar" ? value.label.ar : value.label.en))
        .filter(Boolean)
        .join(", ");

      return values ? `${optionName}: ${values}` : optionName;
    })
    .filter(Boolean)
    .join(" | ");
}

function uniqueRepresentativeProducts(products: AutomationProduct[], limit: number) {
  const seen = new Set<string>();
  const unique: AutomationProduct[] = [];

  for (const product of products) {
    const normalizedName = normalizeSearchText(product.name)
      .split(" ")
      .filter((token) => token.length > 2)
      .slice(0, 3)
      .join(" ");
    const key = normalizedName || product.id;

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(product);

    if (unique.length >= limit) break;
  }

  return unique;
}

function absoluteUrl(pathOrUrl: string, baseUrl: string) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, baseUrl).toString();
}

function toAutomationProduct(
  product: ProductRow,
  language: AutomationLanguage,
  baseUrl: string
): AutomationProduct {
  const images = normalizeImagesArray(
    Array.isArray(product.images_json) && product.images_json.length
      ? (product.images_json as string[])
      : product.image_url
      ? [product.image_url]
      : []
  ).map((image) => absoluteUrl(image, baseUrl));
  const stock = Number(product.stock || 0);
  const lowStockThreshold =
    typeof product.low_stock_threshold === "number" ? product.low_stock_threshold : 10;
  const isAvailable = Boolean(product.is_active) && stock > 0;
  const stockStatus = !isAvailable
    ? "out_of_stock"
    : stock <= lowStockThreshold
    ? "low_stock"
    : "in_stock";
  const name =
    language === "ar"
      ? product.name_ar || product.name_en || ""
      : product.name_en || product.name_ar || "";
  const description =
    language === "ar"
      ? product.description_ar || product.description_en || ""
      : product.description_en || product.description_ar || "";

  return {
    id: product.id,
    name,
    nameAr: product.name_ar || "",
    nameEn: product.name_en || product.name_ar || "",
    description,
    price: Number(product.price || 0),
    currency: "EGP",
    category: normalizeCategory(product.category || ""),
    productUrl: absoluteUrl(`/product/${product.id}`, baseUrl),
    imageUrl: images[0] || "",
    images,
    isAvailable,
    stockStatus,
    stock,
    lowStockThreshold,
    variantSummary: variantSummary(product, language),
  };
}

export function buildAutomationSuggestedReply(
  products: AutomationProduct[],
  language: AutomationLanguage,
  context?: {
    intent?: AutomationSearchIntent;
    categoryIntent?: CategoryIntent | null;
    clarifyReply?: string;
    baseUrl?: string;
  }
) {
  const first = products[0];
  const categoryIntent = context?.categoryIntent || null;

  if (context?.intent === "category" && categoryIntent && products.length) {
    const examples = uniqueRepresentativeProducts(products, 3);

    if (language === "ar") {
      const lines = [
        `متوفر عندنا ${categoryIntent.labelAr}: ${categoryIntent.examplesAr}.`,
        "أمثلة متاحة:",
        ...examples.map(
          (product) =>
            `- ${product.name} - ${product.price} جنيه: ${product.productUrl}`
        ),
        `شوف كل القسم من هنا: ${categoryUrl(categoryIntent.category, context.baseUrl || "")}`,
        categoryIntent.variantNoteAr,
      ];

      return lines.join("\n");
    }

    const lines = [
      `We have ${categoryIntent.labelEn}: ${categoryIntent.examplesEn}.`,
      "Available examples:",
      ...examples.map(
        (product) => `- ${product.name} - EGP ${product.price}: ${product.productUrl}`
      ),
      `Browse the full section here: ${categoryUrl(
        categoryIntent.category,
        context.baseUrl || ""
      )}`,
      categoryIntent.variantNoteEn,
    ];

    return lines.join("\n");
  }

  if (!first) {
    if (context?.clarifyReply) {
      return context.clarifyReply;
    }

    return language === "ar"
      ? "\u0645\u0646 \u0641\u0636\u0644\u0643 \u0627\u0631\u0633\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c \u0627\u0648 \u0635\u0648\u0631\u0629 \u0644\u0647."
      : "Could you share the product name or send a photo?";
  }

  if (!first.isAvailable) {
    return language === "ar"
      ? `${first.name} \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631 \u062d\u0627\u0644\u064a\u0627. \u062a\u062d\u0628 \u0627\u0631\u0634\u062d \u0644\u0643 \u0628\u062f\u064a\u0644\u061f`
      : `${first.name} is currently out of stock. Would you like an alternative?`;
  }

  if (language === "ar") {
    const variantText = first.variantSummary
      ? `\nالمتاح منه: ${first.variantSummary}.`
      : "";

    return `${first.name} متوفر حاليا بسعر ${first.price} جنيه.${variantText}\nالطلب من هنا: ${first.productUrl}`;
  }

  const variantText = first.variantSummary
    ? `\nAvailable options: ${first.variantSummary}.`
    : "";

  return `${first.name} is available for EGP ${first.price}.${variantText}\nYou can view it and complete your order here: ${first.productUrl}`;
}

function getSearchConfidence(bestScore: number): "high" | "medium" | "low" {
  if (bestScore >= 10) return "high";
  if (bestScore >= 6) return "medium";

  return "low";
}

function buildSafeClarifyReply(language: AutomationLanguage, categoryIntent?: CategoryIntent | null) {
  if (language === "ar") {
    if (categoryIntent) {
      return `ممكن توضح النوع المطلوب من ${categoryIntent.labelAr}؟ ابعت الاسم أو صورة المنتج أو الاستخدام، وهدور لك على أقرب اختيار متاح.`;
    }

    return "مش ظاهر عندي تطابق مؤكد للمنتج المطلوب. ممكن تبعت اسم المنتج بشكل أوضح أو صورة له، وهنرشح لك الأقرب من المتاح.";
  }

  if (categoryIntent) {
    return `Could you clarify which ${categoryIntent.labelEn} you need? Send the product name, a photo, or the use case and I will find the closest available option.`;
  }

  return "I could not find a confident product match. Please send the product name more clearly or share a photo, and I will suggest the closest available option.";
}

function buildHumanHandoffReply(language: AutomationLanguage) {
  return language === "ar"
    ? "طلبك يحتاج متابعة من خدمة العملاء. ابعتلنا تفاصيل أكتر أو رقم الطلب في رسالة، وفريق Cesar Store هيراجعها معاك."
    : "Your request needs customer service follow-up. Please send more details or your order number in a message and the Cesar Store team will review it with you.";
}

export async function searchAutomationProducts(input: {
  query: string;
  requestedLanguage?: string | null;
  limit?: number;
  baseUrl: string;
}): Promise<AutomationProductSearchResult> {
  const query = input.query.trim();
  const language = detectAutomationLanguage(query, input.requestedLanguage || null);
  const limit = Math.min(Math.max(Number(input.limit || 5), 1), 10);

  if (query.length < 2) {
    return {
      schemaVersion: 1,
      query,
      language,
      products: [],
      suggestedReply: buildAutomationSuggestedReply([], language),
      meta: {
        source: "cesar-store",
        count: 0,
        bestScore: 0,
        confidence: "low",
        intent: "clarify",
        autoReply: "clarify",
        handoffReason: null,
        matchedCategory: null,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  const understanding = understandQuery(query);
  const clarifyIntent = detectClarifyIntent(query);
  const detectedCategory = detectCategoryIntent(query)?.intent || null;
  const humanHandoff = understanding.humanHandoff;
  const productRequest = understanding.productRequest;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name_ar,name_en,description_ar,description_en,price,image_url,images_json,stock,category,is_active,low_stock_threshold,variant_options_json,variants_json"
    )
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name_ar", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  const scoredProducts = ((data || []) as ProductRow[])
    .map((product) => ({
      product,
      score: scoreProduct(product, query, understanding, detectedCategory),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      return Number(b.product.stock || 0) - Number(a.product.stock || 0);
  });
  const bestScore = scoredProducts[0]?.score || 0;
  const broadCategoryQuery = isBroadCategoryQuery(query, detectedCategory);
  const categoryMode =
    Boolean(detectedCategory) &&
    Boolean(scoredProducts.length) &&
    (bestScore < 16 || (broadCategoryQuery && bestScore < 20));
  const needsPostContext =
    understanding.needsPostContext && !detectedCategory && bestScore < 10;
  const shouldClarify =
    !humanHandoff &&
    !needsPostContext &&
    (Boolean(clarifyIntent && bestScore < 16) ||
      (!categoryMode && bestScore > 0 && bestScore < MIN_DIRECT_PRODUCT_SCORE) ||
      (!scoredProducts.length && productRequest));
  const intent: AutomationSearchIntent = humanHandoff || needsPostContext
    ? "clarify"
    : shouldClarify
    ? "clarify"
    : categoryMode
    ? "category"
    : scoredProducts.length
    ? "product"
    : "clarify";
  const products = (shouldClarify || humanHandoff || needsPostContext ? [] : scoredProducts)
    .slice(0, limit)
    .map((item) => toAutomationProduct(item.product, language, input.baseUrl));
  const effectiveBestScore =
    intent === "category" && products.length
      ? Math.max(bestScore, 12)
      : clarifyIntent && shouldClarify
      ? Math.max(bestScore, 10)
      : bestScore;
  const clarifyReply =
    humanHandoff
      ? buildHumanHandoffReply(language)
      : needsPostContext
      ? buildSafeClarifyReply(language, detectedCategory)
      : clarifyIntent && language === "ar"
      ? clarifyIntent.replyAr
      : clarifyIntent
      ? clarifyIntent.replyEn
      : shouldClarify
      ? buildSafeClarifyReply(language, detectedCategory)
      : undefined;
  const autoReply: AutomationReplyAction = humanHandoff || needsPostContext
    ? "handoff"
    : intent === "clarify"
    ? "clarify"
    : "answer";

  return {
    schemaVersion: 1,
    query,
    language,
    products,
    suggestedReply: buildAutomationSuggestedReply(products, language, {
      intent,
      categoryIntent: detectedCategory,
      clarifyReply,
      baseUrl: input.baseUrl,
    }),
    meta: {
      source: "cesar-store",
      count: products.length,
      bestScore: effectiveBestScore,
      confidence: getSearchConfidence(effectiveBestScore),
      intent,
      autoReply,
      handoffReason: humanHandoff
        ? "human_sensitive_request"
        : needsPostContext
        ? "post_context_required"
        : null,
      matchedCategory: detectedCategory?.category || null,
      generatedAt: new Date().toISOString(),
    },
  };
}
