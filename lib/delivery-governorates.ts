export const DELIVERY_NOTICE_AR =
  "التوصيل للقاهرة والجيزة فقط، وقريبًا باقي محافظات الجمهورية";

export const DELIVERY_NOTICE_EN =
  "Delivery to Cairo and Giza only — more governorates coming soon";

export const EGYPT_GOVERNORATES = [
  { name: "القاهرة", available: true },
  { name: "الجيزة", available: true },
  { name: "الإسكندرية", available: false },
  { name: "الدقهلية", available: false },
  { name: "البحر الأحمر", available: false },
  { name: "البحيرة", available: false },
  { name: "الفيوم", available: false },
  { name: "الغربية", available: false },
  { name: "الإسماعيلية", available: false },
  { name: "المنوفية", available: false },
  { name: "المنيا", available: false },
  { name: "القليوبية", available: false },
  { name: "الوادي الجديد", available: false },
  { name: "السويس", available: false },
  { name: "أسوان", available: false },
  { name: "أسيوط", available: false },
  { name: "بني سويف", available: false },
  { name: "بورسعيد", available: false },
  { name: "دمياط", available: false },
  { name: "الشرقية", available: false },
  { name: "جنوب سيناء", available: false },
  { name: "كفر الشيخ", available: false },
  { name: "مطروح", available: false },
  { name: "الأقصر", available: false },
  { name: "قنا", available: false },
  { name: "شمال سيناء", available: false },
  { name: "سوهاج", available: false },
] as const;

export const AVAILABLE_DELIVERY_GOVERNORATES = ["القاهرة", "الجيزة"] as const;

const AVAILABLE_DELIVERY_GOVERNORATE_SET = new Set<string>(
  AVAILABLE_DELIVERY_GOVERNORATES
);

export function isAvailableDeliveryGovernorate(
  value: unknown
): value is (typeof AVAILABLE_DELIVERY_GOVERNORATES)[number] {
  return (
    typeof value === "string" &&
    AVAILABLE_DELIVERY_GOVERNORATE_SET.has(value.trim())
  );
}
