# Cesar Store search performance execution — 2026-11-17

## Decision

Expand non-brand discovery through relevant internal search links on existing category guides. Do not change commerce logic, product status, prices, stock, or inactive product records. Do not optimize `/about`, `/contact`, or `/search-guide` merely because their page-level CTR is low; much of their visibility is consistent with branded sitelink impressions rather than independent product-discovery demand.

## Source and scope

- Source: `cesareshop.com-Performance-on-Search-2026-11-17.zip`
- Search type: Web (text-based)
- Period: 2026-08-16 through 2026-11-15
- Report SHA-256: `0CFFFD5544E207B8525EDD76262687C0D1CAD5F6367CD143FBAD0D6E0114132E`

## Reviewed evidence

- Overall: 302 clicks, 11,657 impressions, 2.59% CTR, and an impression-weighted average position of 7.86.
- Mobile supplied 9,768 impressions (83.8%) and 262 clicks. Desktop supplied 1,631 impressions and 35 clicks.
- Egypt supplied 8,024 impressions and 243 clicks. Saudi Arabia supplied 1,465 impressions and 23 clicks.
- Product snippets supplied 80 clicks from 2,387 impressions at 3.35% CTR and average position 14.49.
- The visible query table contains 324 rows and covers 46.7% of total clicks and 56.2% of total impressions. Search Console omits anonymized queries, so query shares below describe visible rows only.
- Branded terms account for 132 of 141 visible-query clicks (93.6%) and 4,786 of 6,555 visible-query impressions (73.0%).
- Non-brand terms account for 9 clicks from 1,769 visible-query impressions, a 0.51% CTR.
- Comparing two complete six-week windows, impressions moved from 5,733 to 4,920 and clicks from 150 to 125, while average position improved from 9.74 to 6.23. This is an observed comparison, not proof that ranking changes caused the traffic movement.

## Highest addressable non-brand clusters

| Query cluster | Visible impressions | Average position | Matching live destination |
| --- | ---: | ---: | --- |
| حامل ريماكس | 123 | 16.33 | Car accessories / active Remax phone holder |
| محول سيارة | 78 | 32.35 | Car accessories / active 220V car inverter |
| معالج الزيت | 63 | 38.27 | Fluids and additives / active oil treatment |
| ماكت | 63 | 16.57 | Car accessories / active model cars |
| car spray | 69 | 40.32 | Car air fresheners |
| معطر سيارات | 56 | 35.75 | Car air fresheners |
| مساحة سيليكون | 53 | 21.36 | Car cleaning products / active silicone squeegee |
| رافع اوكتان | 32 | 4.59 | Fluids and additives / active Cyclo octane booster |

## Safe second implementation

1. Add only the report-backed phrases to the existing `InternalSearchLinks` blocks on the relevant category guides.
2. Keep the links routed through `/shop?search=...`, so results continue to respect current product activation and availability.
3. Avoid static links to inactive products and avoid changing product records.
4. Preserve existing guide content, schemas, titles, and commerce behavior.

## Measurement

Use the next complete 28-day period and compare it with the preceding complete 28-day period. Review impressions, clicks, CTR, and position for the listed query clusters and the five edited guide pages. Treat movement as directional until at least one complete comparison period is available.
