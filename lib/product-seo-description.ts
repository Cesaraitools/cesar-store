import { normalizeCategory } from "@/lib/category-normalizer";

type LocalizedText = {
  ar?: string | null;
  en?: string | null;
};

type SeoProductDescriptionInput = {
  name: LocalizedText;
  description: LocalizedText;
  category?: string | null;
};

type ProductFacts = {
  scale?: string | null;
  volume?: string | null;
  wattage?: string | null;
  amperage?: string | null;
  length?: string | null;
  socket?: string | null;
  color?: string | null;
  scent?: string | null;
};

const WEAK_DESCRIPTION_LENGTH = 130;

function cleanText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstMatch(input: string, pattern: RegExp) {
  return input.match(pattern)?.[1] || null;
}

function findAny(input: string, terms: string[]) {
  const normalized = input.toLowerCase();

  return terms.find((term) => normalized.includes(term.toLowerCase())) || null;
}

function titleFor(product: SeoProductDescriptionInput, lang: "ar" | "en") {
  return cleanText(product.name[lang] || product.name.ar || product.name.en);
}

function isScaleModelTitle(title: string) {
  const normalized = title.toLowerCase();

  return (
    normalized.includes("ماكت") ||
    normalized.includes("مجسم") ||
    normalized.includes("scale model") ||
    normalized.includes("model car") ||
    /\b1:\d+\b/.test(normalized)
  );
}

function extractFacts(title: string): ProductFacts {
  const color = findAny(title, [
    "أسود",
    "اسود",
    "black",
    "أبيض",
    "ابيض",
    "white",
    "أزرق",
    "ازرق",
    "blue",
    "أحمر",
    "احمر",
    "red",
    "أخضر",
    "اخضر",
    "green",
    "ذهبي",
    "gold",
    "فضي",
    "silver",
    "رمادي",
    "gray",
    "grey",
    "أصفر",
    "اصفر",
    "yellow",
  ]);
  const scent = findAny(title, [
    "خوخ",
    "توت",
    "بلاك أيس",
    "black ice",
    "جوز الهند",
    "coconut",
    "ياسمين",
    "jasmine",
    "لافندر",
    "lavender",
    "فانيليا",
    "vanilla",
    "فراولة",
    "strawberry",
    "ليمون",
    "lemon",
    "تفاح",
    "apple",
    "روز",
    "rose",
    "اوشن",
    "ocean",
  ]);

  return {
    scale: firstMatch(title, /\b(1:\d+)\b/),
    volume:
      firstMatch(title, /(\d+(?:\.\d+)?)\s*(?:مل|ml)\b/i)?.concat(" ml") ||
      firstMatch(title, /(\d+(?:\.\d+)?)\s*(?:لتر|liter|litre|l)\b/i)?.concat(" liter") ||
      null,
    wattage: firstMatch(title, /(\d+)\s*(?:وات|watt|w)\b/i)?.concat(" W") || null,
    amperage:
      firstMatch(title, /(\d+)\s*(?:امبير|أمبير|amp|a)\b/i)?.concat(" A") || null,
    length: firstMatch(title, /(\d+)\s*(?:متر|meter|m)\b/i)?.concat(" m") || null,
    socket: title.match(/\bH\d+(?:\/\d+\/\d+)?\b/i)?.[0] || null,
    color,
    scent,
  };
}

function factPhraseAr(facts: ProductFacts) {
  const parts = [
    facts.scale ? `مقاس ${facts.scale}` : null,
    facts.volume ? `حجم ${facts.volume}` : null,
    facts.wattage ? `قدرة ${facts.wattage}` : null,
    facts.amperage ? `قدرة ${facts.amperage}` : null,
    facts.length ? `طول ${facts.length}` : null,
    facts.socket ? `سوكت ${facts.socket}` : null,
    facts.color ? `لون ${facts.color}` : null,
    facts.scent ? `رائحة ${facts.scent}` : null,
  ].filter(Boolean);

  return parts.length ? ` يشمل بيانات مهمة مثل ${parts.join("، ")}.` : "";
}

function factPhraseEn(facts: ProductFacts) {
  const parts = [
    facts.scale ? `scale ${facts.scale}` : null,
    facts.volume ? `${facts.volume} size` : null,
    facts.wattage ? `${facts.wattage} power` : null,
    facts.amperage ? `${facts.amperage} rating` : null,
    facts.length ? `${facts.length} length` : null,
    facts.socket ? `${facts.socket} socket` : null,
    facts.color ? `${facts.color} color` : null,
    facts.scent ? `${facts.scent} scent` : null,
  ].filter(Boolean);

  return parts.length ? ` Key details include ${parts.join(", ")}.` : "";
}

function categoryDescriptionAr(category: string, title: string) {
  if (isScaleModelTitle(title)) {
    return "مجسم سيارة مناسب للديكور والاقتناء وعشاق السيارات، يصلح للمكتب أو الرف أو كهدية بسيطة لمحبي ماكيت السيارات.";
  }

  switch (category) {
    case "air-fresheners":
      return "معطر سيارة يساعد على تحسين رائحة صالون العربية وإضافة إحساس منعش أثناء القيادة، مناسب للاستخدام اليومي داخل السيارة.";
    case "detergent":
      return "منتج تنظيف سيارات مخصص للعناية بالسيارة من الداخل أو الخارج حسب نوع المنتج، يساعد في الحفاظ على مظهر نظيف ومرتب.";
    case "cars-lights":
      return "إضاءة سيارة مناسبة للتبديل أو تحسين الرؤية والشكل حسب نوع اللمبة، مع ضرورة مراجعة المقاس والتوافق قبل التركيب.";
    case "equipment":
      return "أداة سيارة عملية للطوارئ أو الصيانة الخفيفة، مناسبة للاحتفاظ بها في السيارة عند الحاجة على الطريق أو داخل الجراج.";
    case "additives-fluids":
      return "سائل أو إضافة للسيارة مخصص لاستخدامات العناية بالمحرك أو الزجاج أو نظام الوقود حسب نوع المنتج، ويستخدم وفق تعليمات العبوة.";
    case "cars-accessories":
      return "إكسسوار سيارة عملي يساعد في تحسين الراحة أو التنظيم أو الحماية داخل العربية، مناسب للاستخدام اليومي ولملاك السيارات.";
    default:
      return "منتج سيارات من Cesar Store مناسب للعناية بالسيارة أو تحسين الاستخدام اليومي حسب نوع المنتج.";
  }
}

function categoryDescriptionEn(category: string, title: string) {
  if (isScaleModelTitle(title)) {
    return "A scale model car for display, collecting, desk decor, shelf styling, or gifting to car enthusiasts.";
  }

  switch (category) {
    case "air-fresheners":
      return "A car air freshener for improving interior scent and keeping the cabin more pleasant during daily driving.";
    case "detergent":
      return "A car cleaning product for interior or exterior care, helping maintain a cleaner and more organized vehicle look.";
    case "cars-lights":
      return "A car lighting product for replacement or visual upgrade; check socket type and compatibility before installation.";
    case "equipment":
      return "A practical car tool for emergency use or light maintenance, useful to keep in the vehicle or garage.";
    case "additives-fluids":
      return "A car fluid or additive for engine, fuel, windshield, or maintenance use depending on the product type; follow label instructions.";
    case "cars-accessories":
      return "A practical car accessory for comfort, organization, protection, or daily vehicle use.";
    default:
      return "A Cesar Store car product for vehicle care, accessories, or everyday driving needs.";
  }
}

function keywordTailAr(category: string, title: string) {
  if (isScaleModelTitle(title)) {
    return "كلمات مرتبطة: مجسم سيارة، ماكت سيارات، scale model car، ديكور سيارات، هدية لمحبي السيارات.";
  }

  switch (category) {
    case "air-fresheners":
      return "كلمات مرتبطة: معطر سيارة، معطرات سيارات، رائحة سيارة، car air freshener، car perfume.";
    case "detergent":
      return "كلمات مرتبطة: منظفات سيارات، تنظيف العربية، شامبو سيارات، car cleaning products، car care.";
    case "cars-lights":
      return "كلمات مرتبطة: إضاءة سيارات، لمبات سيارات، كشافات سيارة، car LED lights، vehicle lighting.";
    case "equipment":
      return "كلمات مرتبطة: أدوات سيارات، معدات سيارات، طوارئ السيارة، car tools، car emergency equipment.";
    case "additives-fluids":
      return "كلمات مرتبطة: سوائل سيارات، إضافات وقود، منظف رشاشات، مياه مساحات، car fluids.";
    case "cars-accessories":
      return "كلمات مرتبطة: إكسسوارات سيارات، ملحقات سيارات، car accessories Egypt، car organizer.";
    default:
      return "كلمات مرتبطة: منتجات سيارات، عناية بالسيارة، إكسسوارات سيارات، Cesar Store Egypt.";
  }
}

function keywordTailEn(category: string, title: string) {
  if (isScaleModelTitle(title)) {
    return "Related searches: scale model car, diecast model car, car model collectible, car decor gift.";
  }

  switch (category) {
    case "air-fresheners":
      return "Related searches: car air freshener, car perfume, car scent, car air fresheners Egypt.";
    case "detergent":
      return "Related searches: car cleaning products, car care, car shampoo, microfiber towel.";
    case "cars-lights":
      return "Related searches: car LED lights, vehicle lighting, car bulbs, auto lighting.";
    case "equipment":
      return "Related searches: car tools, emergency car kit, tire air compressor, battery jumper cable.";
    case "additives-fluids":
      return "Related searches: car fluids, fuel additives, injector cleaner, windshield washer fluid.";
    case "cars-accessories":
      return "Related searches: car accessories, auto accessories Egypt, car organizer, vehicle accessories.";
    default:
      return "Related searches: car products, car care, car accessories, Cesar Store Egypt.";
  }
}

function isWeakDescription(description: string, title: string) {
  const text = cleanText(description);

  if (!text) return true;
  if (text.length < WEAK_DESCRIPTION_LENGTH) return true;

  if (isScaleModelTitle(title)) {
    const normalized = text.toLowerCase();

    return !(
      normalized.includes("مجسم") ||
      normalized.includes("ماكت") ||
      normalized.includes("scale model") ||
      normalized.includes("model car")
    );
  }

  return false;
}

export function getSeoProductDescription(
  product: SeoProductDescriptionInput,
  lang: "ar" | "en"
) {
  const title = titleFor(product, lang);
  const fallbackTitle = titleFor(product, lang === "ar" ? "en" : "ar");
  const finalTitle = title || fallbackTitle || "Cesar Store product";
  const existing = cleanText(product.description[lang]);
  const category = normalizeCategory(product.category || "");

  if (!isWeakDescription(existing, finalTitle)) {
    return existing;
  }

  const facts = extractFacts(`${product.name.ar || ""} ${product.name.en || ""}`);

  if (lang === "ar") {
    return cleanText(
      `${finalTitle} من متجر سيزر. ${categoryDescriptionAr(category, finalTitle)}${factPhraseAr(
        facts
      )} ${keywordTailAr(category, finalTitle)}`
    );
  }

  return cleanText(
    `${finalTitle} from Cesar Store. ${categoryDescriptionEn(
      category,
      finalTitle
    )}${factPhraseEn(facts)} ${keywordTailEn(category, finalTitle)}`
  );
}

export function getSeoProductDescriptions(product: SeoProductDescriptionInput) {
  return {
    ar: getSeoProductDescription(product, "ar"),
    en: getSeoProductDescription(product, "en"),
  };
}
