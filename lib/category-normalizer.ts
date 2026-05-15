export function normalizeCategory(input?: string): string {
  if (!input) return "";

  const normalized = input.toLowerCase().trim().replace(/\s+/g, "-");

  const aliases: Record<string, string> = {
    "additives-&-fluids": "additives-fluids",
    "additives-and-fluids": "additives-fluids",
    "air-freshener": "air-fresheners",
    "airfresheners": "air-fresheners",
    accessory: "cars-accessories",
    accessories: "cars-accessories",
    "car-accessories": "cars-accessories",
    "cars-light": "cars-lights",
    "car-lights": "cars-lights",
    lights: "cars-lights",
    "equipment-&-tools": "equipment",
    "equipment-and-tools": "equipment",
    tools: "equipment",
    detergents: "detergent",
  };

  return aliases[normalized] || normalized;
}
