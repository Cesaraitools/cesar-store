# Cesar Store AI Search Growth Plan

Last updated: 2026-05-30

## Current completed foundation

- Canonical domain uses `https://www.cesareshop.com`.
- `robots.txt` allows major search and AI crawlers while blocking private paths.
- `sitemap.xml` is live and uses canonical `www` URLs.
- `llms.txt` is live and points crawlers to public resources.
- `products.json` exposes the active catalog in a machine-readable format.
- Product pages include Product structured data and breadcrumb data.
- FAQ page is live at `/faq` with FAQPage structured data.
- About page is live at `/about` with AboutPage and Organization structured data.
- Car care guide is live at `/car-care` with CollectionPage and FAQPage structured data.
- Car air fresheners guide is live at `/car-air-fresheners` with CollectionPage and FAQPage structured data.
- Car cleaning products guide is live at `/car-cleaning-products` with CollectionPage and FAQPage structured data.
- Car accessories guide is live at `/car-accessories` with CollectionPage and FAQPage structured data.
- Car lighting and tools guide is live at `/car-lighting-tools` with CollectionPage and FAQPage structured data.

## Level 1: Entity and answer readiness

Goal: make Cesar Store easy for AI systems to identify, summarize, and cite.

- Keep `/about`, `/faq`, `/llms.txt`, `/products.json`, `robots.txt`, and `sitemap.xml` healthy.
- Request indexing for `/about`, `/faq`, and `/products.json` in Google Search Console and Bing Webmaster Tools.
- Monitor Bing and Google for crawl/indexing status after each deployment.

## Level 2: Category knowledge pages

Goal: create answer-friendly pages for common customer intents, not just product listings.

Recommended pages:

- Done: `/car-care` - car care products.
- Done: `/car-air-fresheners` - car air fresheners.
- Done: `/car-cleaning-products` - car cleaning products.
- Done: `/car-accessories` - car accessories.
- Done: `/car-lighting-tools` - lighting and tools.

Each page should include:

- A clear H1 and short introduction.
- Product category explanation in Arabic.
- Practical buying guidance.
- Links to `/shop`, `/categories`, and relevant products where appropriate.
- A small FAQ section.
- CollectionPage and FAQPage structured data.
- Inclusion in `sitemap.xml` and `llms.txt`.

## Level 3: Product answer enrichment

Goal: make individual products easier to understand and compare.

- Improve product descriptions where they are short or duplicated.
- Add clearer product attributes where available: size, scent, color, use case, compatible area, and package quantity.
- Ensure variant choices are clear on-page and in structured data where practical.
- Consider exposing selected category/product summaries in machine-readable JSON if needed.

## Level 4: Trust and commerce signals

Goal: make the store safer to cite and easier to trust.

- Add shipping/delivery information page if policies are stable.
- Add contact/support page if it can contain richer contact details.
- Add concise ordering guide page.
- Keep return policy indexed and linked.

## Level 5: Measurement and iteration

Goal: improve based on real search behavior.

- Track Google Search Console queries that mention Cesar Store and category terms.
- Track Bing indexed pages and product crawl status.
- Re-check Merchant Center image and product page issues after crawler refreshes.
- Test AI answer visibility manually in ChatGPT, Bing Copilot, Perplexity, and Google AI results over time.

## Current next task

Move to Level 3: enrich product answer quality by reviewing product descriptions, attributes, variants, and category-specific product summaries.
