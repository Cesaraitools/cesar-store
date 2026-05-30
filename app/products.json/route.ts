import { getActiveProducts } from "@/lib/server/catalog";
import { getProductVariantOptions, getProductVariants } from "@/lib/product-variants";
import { getSafeImage } from "@/lib/image-safe";
import { SITE_NAME, SITE_URL, absoluteUrl, compactText } from "@/lib/seo";

export const dynamic = "force-dynamic";

function stockStatus(stock: number) {
  if (stock <= 0) return "out_of_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
}

function firstMatch(input: string, pattern: RegExp) {
  return input.match(pattern)?.[1] || null;
}

function findKeyword(input: string, keywords: string[]) {
  return keywords.find((keyword) => input.includes(keyword)) || null;
}

function productType(category: string, title: string) {
  if (category === "air-fresheners") {
    if (title.includes("مبخر")) return "car incense burner air freshener";
    if (title.includes("طاقه شمسيه") || title.includes("طاقة شمسية")) {
      return "solar car air freshener";
    }
    if (title.includes("تكيف") || title.includes("تكييف")) return "car AC air freshener";
    return "car air freshener";
  }

  if (category === "detergent") {
    if (title.includes("فوط")) return "car microfiber towel";
    if (title.includes("شامبو")) return "car shampoo";
    if (title.includes("واكس") || title.includes("بولش")) return "car wax or polish";
    if (title.includes("تابلو")) return "dashboard polish";
    if (title.includes("فوم")) return "foam cleaner";
    if (title.includes("منظف")) return "car cleaner";
    return "car cleaning product";
  }

  if (category === "equipment") {
    if (title.includes("كمبريسور") || title.includes("كمبروسر")) return "tire air compressor";
    if (title.includes("كابل بطاريه") || title.includes("كابل بطارية")) {
      return "battery jumper cable";
    }
    if (title.includes("واير جر")) return "tow cable";
    return "car tool or equipment";
  }

  if (category === "additives-fluids") {
    if (title.includes("موتور فلاش")) return "engine flush additive";
    if (title.includes("رشاشات")) return "fuel injector cleaner";
    if (title.includes("أوكتان") || title.includes("اوكتان")) return "octane booster";
    if (title.includes("مياه مساحات")) return "windshield washer fluid";
    return "car fluid or additive";
  }

  if (category === "cars-lights") return "car LED lighting kit";

  if (category === "cars-accessories") {
    if (title.includes("ماكت")) return "scale model car";
    if (title.includes("مساحات")) return "windshield wipers";
    if (title.includes("باسكت")) return "car trash bin";
    if (title.includes("رقبه سفر") || title.includes("رقبة سفر")) {
      return "car travel neck pillow";
    }
    if (title.includes("مظلة")) return "car sun shade";
    return "car accessory";
  }

  return "car product";
}

function useCase(category: string, type: string) {
  if (type.includes("air freshener")) return "improve car interior scent";
  if (type.includes("towel")) return "drying or wiping car surfaces";
  if (type.includes("shampoo")) return "washing car exterior surfaces";
  if (type.includes("dashboard")) return "cleaning or shining dashboard surfaces";
  if (type.includes("foam") || type.includes("cleaner")) return "cleaning selected car surfaces";
  if (type.includes("compressor")) return "inflating tires when needed";
  if (type.includes("jumper")) return "battery jump-start support";
  if (type.includes("tow cable")) return "vehicle towing support";
  if (type.includes("LED")) return "car lighting replacement or upgrade";
  if (type.includes("washer fluid")) return "windshield cleaning support";
  if (category === "additives-fluids") return "car fluid or additive use";
  if (type.includes("scale model")) return "decorative scale model or collectible";
  return "car care or accessory use";
}

function safeUseNote(category: string, type: string) {
  if (category === "additives-fluids") {
    return "Follow the product instructions and vehicle requirements before use; additives are not a replacement for mechanical inspection.";
  }

  if (type.includes("jumper") || type.includes("tow cable") || type.includes("compressor")) {
    return "Use carefully according to the product and vehicle instructions, especially during roadside or emergency use.";
  }

  if (type.includes("LED")) {
    return "Check socket type, wattage, and compatibility before installation.";
  }

  return null;
}

function productAttributes(category: string, title: string) {
  const type = productType(category, title);
  const volumeMl = firstMatch(title, /(\d+)\s*(?:ملي|ml)/i);
  const volumeL = firstMatch(title, /(\d+)\s*لتر/i);
  const volume = volumeMl ? `${volumeMl} ml` : volumeL ? `${volumeL} liter` : null;
  const weightG = firstMatch(title, /(\d+)\s*(?:جرام|جم)/i);
  const wattage = firstMatch(title, /(\d+)\s*وات/i);
  const lumens = firstMatch(title, /(\d+)\s*ليومن/i);
  const amperage = firstMatch(title, /(\d+)\s*(?:امبير|أمبير)/i);
  const lengthM = firstMatch(title, /(\d+)\s*متر/i);
  const scale = firstMatch(title, /(1:\d+)/);
  const size = title.match(/(\d+)\s*[xX*]\s*(\d+)/);
  const socket = title.match(/(?:إتش|H)\s*\d+(?:\/\d+\/\d+)?/i)?.[0] || null;
  const scent = findKeyword(title, [
    "خوخ",
    "توت بري",
    "بلاك أيس",
    "جوز الهند",
    "الورد",
    "ياسمين",
    "لافندر",
    "لبان",
    "فانيليا",
    "فنيليا",
    "فراوله",
    "فراولة",
    "رمان",
    "ليمون",
    "تفاح",
    "روز",
    "تروبيكال",
    "اوشن",
    "أورينتال",
    "سبرنج",
  ]);
  const color = findKeyword(title, [
    "أسود",
    "اسود",
    "رمادي",
    "ذهبي",
    "سماوي",
    "بيضاء",
    "أبيض",
    "ابيض",
    "زرقاء",
    "أزرق",
    "ازرق",
    "خضراء",
    "أخضر",
    "اخضر",
    "أصفر",
    "اصفر",
    "بترولي",
    "ميتاليك",
    "ميتالكس",
  ]);

  return {
    productType: type,
    useCase: useCase(category, type),
    volume,
    weight: weightG ? `${weightG} g` : null,
    size: size ? `${size[1]}x${size[2]}` : null,
    scent,
    color,
    scale,
    wattage: wattage ? `${wattage} W` : null,
    lumens: lumens ? `${lumens} lm` : null,
    amperage: amperage ? `${amperage} A` : null,
    length: lengthM ? `${lengthM} m` : null,
    socket,
    safeUseNote: safeUseNote(category, type),
  };
}

function variantSelections(
  options: ReturnType<typeof getProductVariantOptions>,
  selections: Record<string, string>
) {
  return Object.entries(selections).map(([optionId, valueId]) => {
    const option = options.find((item) => item.id === optionId);
    const value = option?.values.find((item) => item.id === valueId);

    return {
      optionId,
      optionName: option?.name || null,
      valueId,
      valueLabel: value?.label || null,
    };
  });
}

export async function GET() {
  const products = await getActiveProducts(10000);
  const body = {
    schemaVersion: 1,
    source: "cesar-store",
    website: SITE_URL,
    storeName: SITE_NAME,
    language: ["ar-EG", "en"],
    currency: "EGP",
    generatedAt: new Date().toISOString(),
    productsCount: products.length,
    products: products.map((product) => {
      const title = product.name.ar || product.name.en;
      const images = product.images.length
        ? product.images.map((image) => absoluteUrl(getSafeImage(image)))
        : [absoluteUrl(getSafeImage())];
      const options = getProductVariantOptions(product);
      const variants = getProductVariants(product)
        .filter((variant) => variant.active !== false)
        .map((variant) => ({
          id: variant.id,
          key: variant.key,
          selections: variantSelections(options, variant.selections),
          price: variant.price ?? product.price,
          stock: variant.stock ?? product.stock,
          image: variant.image ? absoluteUrl(getSafeImage(variant.image)) : null,
        }));

      return {
        id: product.id,
        name: product.name,
        description: {
          ar: compactText(product.description.ar || product.name.ar, 500),
          en: compactText(product.description.en || product.name.en, 500),
        },
        category: product.category,
        price: product.price,
        currency: "EGP",
        availability: product.stock > 0 ? "in_stock" : "out_of_stock",
        stockStatus: stockStatus(product.stock),
        attributes: productAttributes(product.category, title),
        productUrl: absoluteUrl(`/product/${product.id}`),
        imageUrl: images[0],
        images,
        variantOptions: options,
        variants,
        updatedAt: product.updatedAt,
      };
    }),
  };

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
