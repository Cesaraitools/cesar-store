const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SITE_PRODUCTS_URL = "https://www.cesareshop.com/products.json";

const alreadyAppliedIds = new Set([
  "1c6b441e-c735-4f63-afa4-bc0511058e0c",
  "b9fe7adb-5c44-4732-b5a1-ec0947920f02",
  "5bebdb55-e095-4433-b4c9-69cf28e808b7",
  "ff2352a6-3af3-448e-8405-005c332df8ba",
  "a996fc4f-c493-4a05-9e65-5b988207b24f",
  "8d93570b-e397-4487-bfa3-1bd6bd985ae8",
  "562b33d1-051c-4589-9880-afb0bbbdd78f",
  "5c67e97b-646c-45b7-9b01-bc8c706ab81a",
  "d019cb60-5a27-450f-a4e8-6615e09b0ad3",
  "64d04816-bc27-41f0-80f9-836e9b4126af",
]);

const categoryAr = {
  "air-fresheners": "معطرات السيارات",
  "cars-accessories": "إكسسوارات السيارات",
  detergent: "منظفات وعناية السيارة",
  "cars-lights": "إضاءة السيارات",
  equipment: "الأدوات والمعدات",
  "additives-fluids": "السوائل والإضافات",
};

const scentEn = {
  "توت بري": "raspberry",
  خوخ: "peach",
  "بلاك أيس": "black ice",
  "جوز الهند": "coconut",
  الورد: "rose",
  روز: "rose",
  ياسمين: "jasmine",
  لافندر: "lavender",
  لبان: "gum",
  فانيليا: "vanilla",
  فنيليا: "vanilla",
  فراوله: "strawberry",
  فراولة: "strawberry",
  رمان: "pomegranate",
  ليمون: "lemon",
  تفاح: "apple",
  تروبيكال: "tropical",
  اوشن: "ocean",
  أورينتال: "oriental",
  سبرنج: "spring",
};

const colorEn = {
  أسود: "black",
  اسود: "black",
  رمادي: "gray",
  ذهبي: "gold",
  سماوي: "sky blue",
  بيضاء: "white",
  أبيض: "white",
  ابيض: "white",
  زرقاء: "blue",
  أزرق: "blue",
  ازرق: "blue",
  خضراء: "green",
  أخضر: "green",
  اخضر: "green",
  أصفر: "yellow",
  اصفر: "yellow",
  بترولي: "petrol blue",
  ميتاليك: "metallic",
  ميتالكس: "metallic",
};

function text(value) {
  return String(value || "").trim();
}

function arName(product) {
  return text(product.name?.ar || product.name?.en || "المنتج");
}

function enName(product) {
  return text(product.name?.en || product.name?.ar || "Product");
}

function sentence(parts) {
  return parts.filter(Boolean).join(" ");
}

function enValue(value, map) {
  if (!value) return null;
  return map[value] || value;
}

function visibleAr(attrs) {
  const values = [];
  if (attrs.volume) values.push(`الحجم ${attrs.volume}`);
  if (attrs.weight) values.push(`الوزن ${attrs.weight}`);
  if (attrs.size) values.push(`المقاس ${attrs.size}`);
  if (attrs.scent) values.push(`الرائحة ${attrs.scent}`);
  if (attrs.color) values.push(`اللون ${attrs.color}`);
  if (attrs.scale) values.push(`المقياس ${attrs.scale}`);
  if (attrs.wattage) values.push(`القدرة ${attrs.wattage}`);
  if (attrs.lumens) values.push(`شدة الإضاءة ${attrs.lumens}`);
  if (attrs.amperage) values.push(`الأمبير ${attrs.amperage}`);
  if (attrs.length) values.push(`الطول ${attrs.length}`);
  if (attrs.socket) values.push(`القاعدة ${attrs.socket}`);
  return values.length ? `المواصفات الظاهرة: ${values.join("، ")}.` : "";
}

function visibleEn(attrs) {
  const values = [];
  if (attrs.volume) values.push(`volume ${attrs.volume}`);
  if (attrs.weight) values.push(`weight ${attrs.weight}`);
  if (attrs.size) values.push(`size ${attrs.size}`);
  if (attrs.scent) values.push(`scent ${enValue(attrs.scent, scentEn)}`);
  if (attrs.color) values.push(`color ${enValue(attrs.color, colorEn)}`);
  if (attrs.scale) values.push(`scale ${attrs.scale}`);
  if (attrs.wattage) values.push(`wattage ${attrs.wattage}`);
  if (attrs.lumens) values.push(`light output ${attrs.lumens}`);
  if (attrs.amperage) values.push(`amperage ${attrs.amperage}`);
  if (attrs.length) values.push(`length ${attrs.length}`);
  if (attrs.socket) values.push(`socket ${attrs.socket}`);
  return values.length ? `Visible details: ${values.join(", ")}.` : "";
}

function detergentDescription(product, attrs) {
  const nameAr = arName(product);
  const nameEn = enName(product);
  const type = attrs.productType || "";

  if (type.includes("towel")) {
    return {
      ar: sentence([
        `${nameAr} فوطة مخصصة لتجفيف ومسح أسطح السيارة أثناء التنظيف الداخلي أو الخارجي.`,
        visibleAr(attrs),
        "مناسبة للاستخدام مع منتجات العناية بالسيارة عند الحاجة لفوطة ناعمة قابلة لإعادة الاستخدام.",
      ]),
      en: sentence([
        `${nameEn} is a microfiber towel for drying and wiping car surfaces during interior or exterior cleaning.`,
        visibleEn(attrs),
        "Suitable for regular car care use with cleaning products.",
      ]),
    };
  }

  if (type.includes("shampoo")) {
    return {
      ar: sentence([
        `${nameAr} شامبو مخصص لغسيل جسم السيارة الخارجي والمساعدة في إزالة الاتساخات أثناء الغسيل اليدوي.`,
        visibleAr(attrs),
        "يفضل استخدامه على سطح بارد وفي الظل مع الشطف الجيد بعد الغسيل.",
      ]),
      en: sentence([
        `${nameEn} is a car shampoo for exterior hand washing and cleaning dirt from the car body.`,
        visibleEn(attrs),
        "Use on a cool surface, preferably in shade, and rinse well after washing.",
      ]),
    };
  }

  if (type.includes("dashboard")) {
    return {
      ar: sentence([
        `${nameAr} منتج عناية مخصص للتابلوه والأسطح الداخلية المناسبة داخل السيارة.`,
        visibleAr(attrs),
        "يستخدم حسب تعليمات العبوة ويفضل تجربته على جزء صغير عند الحاجة.",
      ]),
      en: sentence([
        `${nameEn} is a dashboard care product for suitable interior car surfaces.`,
        visibleEn(attrs),
        "Follow the label directions and test on a small area when needed.",
      ]),
    };
  }

  if (type.includes("wax") || type.includes("polish")) {
    return {
      ar: sentence([
        `${nameAr} منتج عناية للسيارة مخصص للمساعدة في تلميع أو حماية السطح حسب نوع المنتج.`,
        visibleAr(attrs),
        "اتبع تعليمات الاستخدام وتجنب تطبيقه على سطح ساخن.",
      ]),
      en: sentence([
        `${nameEn} is a car care product for polishing or surface care according to the product type.`,
        visibleEn(attrs),
        "Follow the usage directions and avoid applying it on a hot surface.",
      ]),
    };
  }

  return {
    ar: sentence([
      `${nameAr} منتج تنظيف وعناية للسيارة مخصص للاستخدام على الأسطح المناسبة حسب طبيعة المنتج.`,
      visibleAr(attrs),
      "يفضل اتباع تعليمات الاستخدام وتجربة المنتج على جزء صغير عند الحاجة.",
    ]),
    en: sentence([
      `${nameEn} is a car cleaning and care product for suitable surfaces according to the product type.`,
      visibleEn(attrs),
      "Follow the usage directions and test on a small area when needed.",
    ]),
  };
}

function airFreshenerDescription(product, attrs) {
  const nameAr = arName(product);
  const nameEn = enName(product);
  const type = attrs.productType || "";
  const scentAr = attrs.scent ? ` برائحة ${attrs.scent}` : "";
  const scentEnglish = attrs.scent ? ` with a ${enValue(attrs.scent, scentEn)} scent` : "";

  if (type.includes("incense burner")) {
    return {
      ar: sentence([
        `${nameAr} مبخرة أو معطر سيارة مخصص لإضافة رائحة لطيفة داخل المقصورة أو المساحات الداخلية المناسبة.`,
        visibleAr(attrs),
        "يستخدم بالطريقة المناسبة لطبيعة المنتج ومع مراعاة التهوية وتعليمات العبوة إن وجدت.",
      ]),
      en: sentence([
        `${nameEn} is a car incense burner or air freshener for adding a pleasant scent inside the cabin or suitable interior spaces.`,
        visibleEn(attrs),
        "Use according to the product type and label directions when available.",
      ]),
    };
  }

  if (type.includes("AC")) {
    return {
      ar: sentence([
        `${nameAr} معطر تكييف سيارة${scentAr} لتحسين رائحة الهواء داخل المقصورة أثناء الاستخدام المناسب.`,
        visibleAr(attrs),
        "يستخدم حسب طريقة التركيب أو الرش الموضحة على العبوة.",
      ]),
      en: sentence([
        `${nameEn} is a car AC air freshener${scentEnglish} for improving the scent inside the cabin during suitable use.`,
        visibleEn(attrs),
        "Follow the package directions for installation or spraying.",
      ]),
    };
  }

  return {
    ar: sentence([
      `${nameAr} معطر سيارة${scentAr} لتحسين رائحة المقصورة والمساحات الداخلية المناسبة.`,
      visibleAr(attrs),
      "مناسب للعملاء الذين يرغبون في رائحة أوضح داخل السيارة مع اتباع تعليمات العبوة.",
    ]),
    en: sentence([
      `${nameEn} is a car air freshener${scentEnglish} for improving the scent inside the cabin or other suitable interior spaces.`,
      visibleEn(attrs),
      "Use according to the label directions.",
    ]),
  };
}

function accessoryDescription(product, attrs) {
  const nameAr = arName(product);
  const nameEn = enName(product);
  const type = attrs.productType || "";

  if (type.includes("scale model")) {
    return {
      ar: sentence([
        `${nameAr} ماكت سيارة مخصص للعرض أو الاقتناء لمحبي السيارات والمجسمات.`,
        visibleAr(attrs),
        "يناسب الاستخدام الديكوري على المكتب أو الرف أو داخل مساحة عرض مناسبة.",
      ]),
      en: sentence([
        `${nameEn} is a scale model car for display or collecting by car enthusiasts.`,
        visibleEn(attrs),
        "Suitable as a decorative piece for a desk, shelf, or display area.",
      ]),
    };
  }

  if (type.includes("wipers")) {
    return {
      ar: sentence([
        `${nameAr} مساحات زجاج للسيارة مخصصة للاستبدال عند توافق النوع والمقاس مع السيارة.`,
        visibleAr(attrs),
        "يفضل التأكد من المقاس ونوع التركيب قبل الشراء.",
      ]),
      en: sentence([
        `${nameEn} is a windshield wiper product for replacement when the size and fitting type are compatible with the vehicle.`,
        visibleEn(attrs),
        "Check size and fitting type before purchase.",
      ]),
    };
  }

  if (type.includes("trash bin")) {
    return {
      ar: sentence([
        `${nameAr} باسكت أو سلة صغيرة للسيارة تساعد في تنظيم المخلفات البسيطة والحفاظ على نظافة المقصورة.`,
        visibleAr(attrs),
        "مناسبة للاستخدام اليومي داخل السيارة حسب مساحة التركيب المتاحة.",
      ]),
      en: sentence([
        `${nameEn} is a small car trash basket for organizing light waste and keeping the cabin cleaner.`,
        visibleEn(attrs),
        "Suitable for daily car interior use where space allows.",
      ]),
    };
  }

  if (type.includes("neck pillow")) {
    return {
      ar: sentence([
        `${nameAr} رقبة سفر مخصصة لدعم راحة الرقبة أثناء السفر أو الانتظار داخل السيارة.`,
        visibleAr(attrs),
        "تستخدم كإكسسوار راحة داخل المقصورة وليست بديلًا عن وضعية جلوس آمنة.",
      ]),
      en: sentence([
        `${nameEn} is a travel neck pillow for neck comfort during trips or waiting inside the car.`,
        visibleEn(attrs),
        "Use as a comfort accessory and keep a safe seating position.",
      ]),
    };
  }

  if (type.includes("sun shade")) {
    return {
      ar: sentence([
        `${nameAr} مظلة أو شمسية سيارة تساعد في تقليل تعرض المقصورة لأشعة الشمس عند الركن.`,
        visibleAr(attrs),
        "تأكد من توافق المقاس وطريقة التثبيت مع السيارة قبل الاستخدام.",
      ]),
      en: sentence([
        `${nameEn} is a car sun shade for reducing direct sunlight inside the parked car.`,
        visibleEn(attrs),
        "Check size and fitting method before use.",
      ]),
    };
  }

  return {
    ar: sentence([
      `${nameAr} إكسسوار سيارة مخصص لتحسين الاستخدام اليومي أو تنظيم المقصورة حسب طبيعة المنتج.`,
      visibleAr(attrs),
      "يراعى التأكد من المقاس أو طريقة التركيب إن كانت مطلوبة.",
    ]),
    en: sentence([
      `${nameEn} is a car accessory for daily use, organization, or cabin convenience according to the product type.`,
      visibleEn(attrs),
      "Check size or fitting method when required.",
    ]),
  };
}

function lightDescription(product, attrs) {
  const nameAr = arName(product);
  const nameEn = enName(product);

  return {
    ar: sentence([
      `${nameAr} طقم إضاءة LED للسيارة مناسب كقطعة بديلة أو ترقية عند توافق القاعدة والمواصفات مع السيارة.`,
      visibleAr(attrs),
      "يجب التأكد من نوع القاعدة والقدرة والتوافق الكهربائي قبل التركيب.",
    ]),
    en: sentence([
      `${nameEn} is a car LED lighting kit for replacement or upgrade when the socket and specifications are compatible with the vehicle.`,
      visibleEn(attrs),
      "Check socket type, wattage, and electrical compatibility before installation.",
    ]),
  };
}

function equipmentDescription(product, attrs) {
  const nameAr = arName(product);
  const nameEn = enName(product);
  const type = attrs.productType || "";

  if (type.includes("compressor")) {
    return {
      ar: sentence([
        `${nameAr} كمبريسور سيارة للمساعدة في نفخ الإطارات عند الحاجة.`,
        visibleAr(attrs),
        "اتبع تعليمات التشغيل وتأكد من ضغط الإطار ومصدر الطاقة المناسب قبل الاستخدام.",
      ]),
      en: sentence([
        `${nameEn} is a car air compressor for tire inflation support when needed.`,
        visibleEn(attrs),
        "Follow operating instructions and check tire pressure and power source before use.",
      ]),
    };
  }

  if (type.includes("jumper")) {
    return {
      ar: sentence([
        `${nameAr} كابل بطارية للمساعدة في تشغيل السيارة عند ضعف البطارية باستخدام مصدر طاقة مناسب.`,
        visibleAr(attrs),
        "يجب استخدامه بحذر مع مراعاة ترتيب التوصيل الصحيح وتعليمات البطارية والسيارة.",
      ]),
      en: sentence([
        `${nameEn} is a battery cable for jump-start support with a suitable power source.`,
        visibleEn(attrs),
        "Use carefully and follow the correct connection order and battery instructions.",
      ]),
    };
  }

  if (type.includes("tow cable")) {
    return {
      ar: sentence([
        `${nameAr} واير جر للمساعدة في سحب أو جر السيارة عند الحاجة.`,
        visibleAr(attrs),
        "يستخدم بحذر وفي حدود تعليمات المنتج والسيارة وظروف الطريق المناسبة.",
      ]),
      en: sentence([
        `${nameEn} is a tow cable for vehicle towing support when needed.`,
        visibleEn(attrs),
        "Use carefully within the product and vehicle instructions and suitable road conditions.",
      ]),
    };
  }

  return {
    ar: sentence([
      `${nameAr} أداة أو معدة سيارة مخصصة للمساعدة في الاستخدامات العملية أو الطوارئ حسب طبيعة المنتج.`,
      visibleAr(attrs),
      "اتبع تعليمات الاستخدام وتأكد من ملاءمة المنتج للسيارة قبل الاستخدام.",
    ]),
    en: sentence([
      `${nameEn} is a car tool or equipment item for practical or emergency use according to the product type.`,
      visibleEn(attrs),
      "Follow the usage directions and check vehicle suitability before use.",
    ]),
  };
}

function fluidDescription(product, attrs) {
  const nameAr = arName(product);
  const nameEn = enName(product);
  const type = attrs.productType || "";

  if (type.includes("engine flush")) {
    return {
      ar: sentence([
        `${nameAr} منظف لدورة زيت المحرك يستخدم قبل تغيير الزيت للمساعدة في تنظيف الرواسب داخل دورة الزيت.`,
        visibleAr(attrs),
        "يستخدم حسب تعليمات العبوة ومتطلبات السيارة، ولا يغني عن الفحص أو الصيانة الميكانيكية.",
      ]),
      en: sentence([
        `${nameEn} is an engine oil-system flush used before an oil change to help clean deposits from the oil system.`,
        visibleEn(attrs),
        "Follow the product label and vehicle requirements; it is not a substitute for mechanical inspection or repair.",
      ]),
    };
  }

  if (type.includes("injector")) {
    return {
      ar: sentence([
        `${nameAr} منظف لنظام الوقود مخصص للمساعدة في تنظيف الرشاشات أو الكربراتير حسب نوع المنتج.`,
        visibleAr(attrs),
        "يستخدم فقط حسب تعليمات العبوة ونوع الوقود المناسب للسيارة.",
      ]),
      en: sentence([
        `${nameEn} is a fuel-system cleaner intended to help clean injectors or carburetor parts according to the product type.`,
        visibleEn(attrs),
        "Use only according to the product label and vehicle fuel requirements.",
      ]),
    };
  }

  if (type.includes("octane")) {
    return {
      ar: sentence([
        `${nameAr} إضافة وقود مخصصة للاستخدام مع البنزين حسب تعليمات العبوة عند الحاجة لمنتج رافع للأوكتان.`,
        visibleAr(attrs),
        "تأكد من ملاءمته لنوع الوقود ومتطلبات السيارة قبل الاستخدام.",
      ]),
      en: sentence([
        `${nameEn} is a gasoline fuel additive for octane-boosting use according to the product label.`,
        visibleEn(attrs),
        "Check fuel type and vehicle requirements before use.",
      ]),
    };
  }

  if (type.includes("washer fluid")) {
    return {
      ar: sentence([
        `${nameAr} سائل لخزان المساحات يساعد في تنظيف الزجاج الأمامي أثناء استخدام المساحات.`,
        visibleAr(attrs),
        "يضاف فقط في خزان المساحات حسب تعليمات العبوة.",
      ]),
      en: sentence([
        `${nameEn} is windshield washer fluid for supporting windshield cleaning during wiper use.`,
        visibleEn(attrs),
        "Use only in the washer-fluid reservoir according to label directions.",
      ]),
    };
  }

  return {
    ar: sentence([
      `${nameAr} منتج من السوائل أو الإضافات المخصصة للسيارة حسب طبيعة الاستخدام الموضحة على العبوة.`,
      visibleAr(attrs),
      "اتبع تعليمات العبوة ومتطلبات السيارة قبل الاستخدام.",
    ]),
    en: sentence([
      `${nameEn} is a car fluid or additive product for vehicle use according to the label directions.`,
      visibleEn(attrs),
      "Follow the product label and vehicle requirements before use.",
    ]),
  };
}

function makeDescription(product) {
  const attrs = product.attributes || {};

  if (product.category === "air-fresheners") return airFreshenerDescription(product, attrs);
  if (product.category === "detergent") return detergentDescription(product, attrs);
  if (product.category === "cars-accessories") return accessoryDescription(product, attrs);
  if (product.category === "cars-lights") return lightDescription(product, attrs);
  if (product.category === "equipment") return equipmentDescription(product, attrs);
  if (product.category === "additives-fluids") return fluidDescription(product, attrs);

  return {
    ar: `${arName(product)} منتج من ${categoryAr[product.category] || "منتجات السيارة"} للاستخدام المناسب حسب طبيعة المنتج.`,
    en: `${enName(product)} is a car product for suitable use according to the product type.`,
  };
}

async function fetchProducts() {
  const response = await fetch(`${SITE_PRODUCTS_URL}?v=description-enrichment-${Date.now()}`, {
    headers: {
      "Cache-Control": "no-cache",
      "User-Agent": "CesarDescriptionEnrichment/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products.json: ${response.status}`);
  }

  return response.json();
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function countByCategory(products) {
  return products.reduce((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const apply = process.argv.includes("--apply");
  const sampleCount = Number(process.argv.find((arg) => arg.startsWith("--sample="))?.split("=")[1] || 8);
  const data = await fetchProducts();
  const products = Array.isArray(data.products) ? data.products : [];
  const targets = products.filter((product) => !alreadyAppliedIds.has(product.id));

  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`Active products: ${products.length}`);
  console.log(`Products already applied in batch 01: ${alreadyAppliedIds.size}`);
  console.log(`Products targeted now: ${targets.length}`);
  console.log(`Target counts: ${JSON.stringify(countByCategory(targets))}`);

  for (const product of targets.slice(0, sampleCount)) {
    const description = makeDescription(product);
    console.log(`\n--- ${product.category} | ${product.id}`);
    console.log(arName(product));
    console.log(description.ar);
    console.log(description.en);
  }

  if (!apply) {
    return;
  }

  const supabase = createSupabaseClient();
  let updated = 0;

  for (const product of targets) {
    const description = makeDescription(product);
    const { error } = await supabase
      .from("products")
      .update({
        description_ar: description.ar,
        description_en: description.en,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      throw new Error(`${product.id}: ${error.message}`);
    }

    updated += 1;
    if (updated % 25 === 0 || updated === targets.length) {
      console.log(`Updated ${updated}/${targets.length}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
