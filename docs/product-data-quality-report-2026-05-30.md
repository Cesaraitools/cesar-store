# Product Data Quality Report

Date: 2026-05-30

Source checked: `https://www.cesareshop.com/products.json`

## Summary

- Total active products: 225
- Categories found:
  - `air-fresheners`: 111 products
  - `cars-accessories`: 54 products
  - `detergent`: 42 products
  - `cars-lights`: 6 products
  - `equipment`: 6 products
  - `additives-fluids`: 6 products
- Weak descriptions detected: 224 products

Most product descriptions currently repeat the product name or are too short to help search engines, AI answer engines, or customers understand the product.

## Why this matters

AI search systems need more than product names. They work better when each product has clear, structured facts:

- product type
- usage
- size, volume, wattage, amperage, color, scent, scale, or variant
- safe-use notes where relevant
- category-specific wording that is accurate and not exaggerated

## Findings by category

| Category | Products | Weak descriptions | Main opportunity |
| --- | ---: | ---: | --- |
| `air-fresheners` | 111 | 111 | Extract scent, size, style, and use case. |
| `cars-accessories` | 54 | 54 | Split model cars, wipers, organizers, travel comfort, shades, and small accessories. |
| `detergent` | 42 | 42 | Extract surface/use case: microfiber towels, wax shampoo, dashboard polish, foam cleaner, tire cleaner, engine cleaner. |
| `cars-lights` | 6 | 5 | Extract wattage, lumen value, lamp type/socket where visible. |
| `equipment` | 6 | 6 | Extract tool type: compressor, battery cable, tow cable, amp rating, length, piston count. |
| `additives-fluids` | 6 | 6 | Extract additive/fluid type, volume, and safe-use notes. |

## Extractable signals already visible in product names

These can be converted into structured product attributes without inventing data:

- Scale model ratios: examples include `1:18`, `1:24`, `1:28`, `1:32`.
- Product sizes: examples include `40x40`, `80x60`, `50x60`, `120x60`.
- Volumes: examples include `50 ml`, `220 ml`, `425 ml`, `450 ml`, `500 ml`, `650 ml`, `700 ml`, `1 liter`.
- Wattage and lighting data: examples include `55 watt`, `75 watt`, `5500 lumen`, `6500 lumen`.
- Amperage: examples include `400 amp`, `800 amp`.
- Lengths: examples include `4 meter`, `5 meter`.
- Scent/color words: examples include peach, lavender, vanilla, strawberry, black ice, coconut, rose, jasmine, lemon, apple, blue, white, green, black, gold.

## Recommended improvement order

### Batch 1: Category-specific attribute extraction

Add computed attributes to `products.json` first. This improves AI-readable data without touching the product database.

Suggested fields:

- `productType`
- `useCase`
- `volume`
- `weight`
- `size`
- `scent`
- `color`
- `scale`
- `wattage`
- `lumens`
- `amperage`
- `length`
- `safeUseNote`

This can be done from names and categories only, so it is low risk.

### Batch 2: Template-based description suggestions

Create a local report of suggested descriptions, not automatic database changes.

Examples:

- Air freshener: mention scent, volume/style, and that the product is for improving car interior smell.
- Cleaning product: mention surface/use case and size when visible.
- Equipment: mention tool type and visible rating/length, with safe-use caution.
- Fluids/additives: mention type and volume, with a note to follow product and vehicle instructions.

### Batch 3: Manual approval and import

After reviewing suggestions, update product data through the site source/admin/import workflow only. Do not manually edit Merchant Center.

## High-priority categories

1. `air-fresheners`: biggest category and easiest to enrich through scent/volume/style.
2. `detergent`: strong commercial intent; many products include sizes and use cases.
3. `equipment` and `additives-fluids`: small categories, but need accurate safety language.
4. `cars-lights`: only 6 products; easy to enrich with wattage/lumen/socket terms.
5. `cars-accessories`: mixed category; should be split carefully into subtypes before mass description changes.

## Guardrails

- Do not invent brand claims, compatibility, material, scent strength, durability, or performance.
- Do not claim a product fixes a mechanical issue.
- For fluids/additives, always include cautious language: follow product instructions and vehicle requirements.
- For battery cables, compressors, and tow cables, include safe-use wording.
- Keep Merchant Center fed from the site/feed only.

## Next recommended implementation

Start with Batch 1: enhance `products.json` with computed AI-readable attributes derived safely from current product names and categories.

## Batch 1 implementation status

Implemented after this report:

- `products.json` now exposes an `attributes` object for each product.
- Attributes are computed from the current product name and category only.
- No product database records were changed.
- No Merchant Center data was edited manually.

Current computed fields:

- `productType`
- `useCase`
- `volume`
- `weight`
- `size`
- `scent`
- `color`
- `scale`
- `wattage`
- `lumens`
- `amperage`
- `length`
- `socket`
- `safeUseNote`

Next recommended implementation: generate a review-only description suggestion report by category before changing stored product descriptions.
