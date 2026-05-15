export function normalizeCategory(input?: string): string {
  if (!input) return "";

  const normalized = input.toLowerCase().trim().replace(/\s+/g, "-");

  const aliases: Record<string, string> = {
    accessory: "cars-accessories",
    accessories: "cars-accessories",
    "car-accessories": "cars-accessories",
  };

  return aliases[normalized] || normalized;
}
