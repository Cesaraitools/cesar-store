# Cesar Store generative AI visibility execution — 2026-11-17

## Decision

Protect and strengthen product-page visibility first, then improve category-guide discovery. Product pages already supply most page-level appearances in the supplied Google Search Console export, while category guides appear only rarely.

## Source and scope

- Source: `cesareshop.com-Performance-on-Search-Generative-AI-Features-2026-11-17.zip`
- Search type: Web (text-based)
- Period: 2026-08-16 through 2026-11-15
- Report scope: Google Search generative AI features
- Report SHA-256: `8A2AB4489B30A9EF49AF4E7AD9225B30CC90055272772224816FFF6EE1532B5A`

## Reviewed evidence

- The chart reports 1,479 property-level impressions over 92 days.
- Daily impressions rose from 13.69 in the partial August period to 17.06 in October. The partial November period averaged 15.87 per day.
- Mobile generated 1,278 of 1,479 impressions (86.4%); desktop generated 176 (11.9%); tablet generated 25 (1.7%).
- Egypt generated 996 of 1,479 impressions (67.3%); Saudi Arabia generated 176 (11.9%).
- The page table contains 1,603 page-level impression rows. Product URLs account for 922 (57.5%) of those rows, while the two homepage URL variants account for 507 (31.6%).
- `/search-guide` recorded 47 page-level impressions and `/about` recorded 45. Individual category guides recorded only 1–3 impressions each.
- Two inactive products account for 87 page-level impressions in the export and now return HTTP 404. Their database rows remain intentionally inactive, so this implementation does not reactivate or expose them.

The page table total is intentionally not treated as the property-level total. Search Console can count more than one page from the same property in page-grouped data, so page rows are used for prioritization and the chart total is used for overall reach.

## Safe first implementation

1. Give unavailable product routes a product-specific 404 experience and prevent them from inheriting the homepage canonical. Next.js supplies `noindex` automatically for the 404 response.
2. Add a visible category-guide link to active product pages without changing cart, price, stock, availability, or variant logic.
3. Add the canonical store seller and category-guide relationship to Product/ProductGroup structured data.
4. Extend the existing SEO/AIO verification script to validate the new structured-data relationships.

## Next measurement

Compare the next complete 28-day period with the previous complete 28-day period. Track generative-AI impressions for active product pages and category guides separately, and use the standard Search Console Performance export for query, clicks, CTR, and average-position decisions.
