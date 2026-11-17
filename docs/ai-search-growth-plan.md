# Cesar Store AI Search Growth Plan

Last updated: 2026-11-17

## November 2026 implementation status

The current implementation package is complete locally and is not yet a production rollout.
It improves search and answer-engine accuracy without changing checkout, order creation,
payment, authentication, cart persistence, or inventory-decrement logic.

### Implemented locally

- Add `noindex`, `nofollow`, and `noarchive` response headers to private and transactional
  routes while keeping the public catalog crawlable.
- Keep real product update timestamps in the sitemap and stop publishing a new fake
  `lastmod` value for static pages on every request.
- Add optional brand, manufacturer, MPN, GTIN, and model fields across the product model,
  admin forms, APIs, catalog mapping, feeds, and structured data.
- Validate GTIN format and checksum before exposing it as a commerce identifier.
- Stop using the product UUID as an MPN and stop assigning the store name as the brand
  when a product brand is unknown.
- Emit one Merchant feed row per sellable variant, with stable IDs, `item_group_id`,
  variant attributes, the variant price, and a direct variant URL.
- Publish `ProductGroup` structured data for variant products and remove an unsupported
  free-return claim from product schema.
- Expose a versioned public catalog in `products.json` with identifiers, variants, current
  availability, price range, and canonical URLs.
- Remove generated keyword-tail text and generic discovery phrases from product copy.
- Reduce the initial shop render to 24 cards with progressive loading while preserving
  client-side search over the full active catalog.
- Reduce the shop HTML payload by sending compact card summaries instead of full variant
  objects and every product image. Local production HTML fell from about 1.19 MB to about
  608 KB in the audit environment.
- Show the actual available variant price or price range on shop cards instead of the
  potentially different base product price.
- Deliver storefront cards, promo slides, product hero images, and thumbnails through
  Supabase's existing width/quality image-rendering endpoint while preserving original
  URLs in product data, Merchant feeds, structured data, and cart records. Browsers that
  accept WebP receive much smaller responses, with an automatic original-image fallback.
- Remove invalid Arabic/English `hreflang` alternates that pointed both languages to the
  same URL. The canonical URL remains intact.

### Purchase-safety gates passed locally

- TypeScript, lint, and the optimized production build pass. Existing unrelated lint
  warnings in admin and orders pages remain documented and do not block the build.
- The shop renders 24 of 261 products initially and progressive loading remains available.
- Search still finds products that are not in the first 24 rendered cards.
- A regular product can be added to the cart with the correct price and stock.
- A variant can be selected, reflected in the URL, added to the cart, and retained with
  the correct option label, price, and stock.
- A 24-image transformed storefront sample totaled about 700 KB (roughly 29 KB per
  image); the same source catalog contains many raw PNG files around 1.3-1.8 MB each.
  Browser checks found no broken images after the change.
- An unauthenticated checkout attempt still redirects to
  `/auth/login?redirect=/checkout`; no test order was created.
- `npm run verify:seo-aio -- --base-url <deployment-url>` provides a read-only
  release gate for public/private indexing headers, sitemap integrity, the AI catalog,
  the Merchant feed, identifier hygiene, and sample product structured data.

### Required before production rollout

1. Review the focused diff and exclude unrelated pre-existing worktree changes.
2. Completed on 2026-11-17: reconcile the divergent local and remote Supabase migration
   histories. The nine already-deployed wholesale versions were marked `applied` in
   migration history without executing their SQL. Only the commerce-identifier migration
   remains pending. Evidence is recorded in
   `docs/supabase-migration-reconciliation-audit-2026-11-17.md`.
3. The application package can be deployed before the database migration without breaking
   ordinary product creation or editing: the API retries legacy writes when the optional
   columns are absent. Saving a non-empty commerce identifier intentionally returns `503`
   until the reviewed migration exists, so identifier data is never discarded silently.
4. Repeat the public shop, product, cart, login redirect, sitemap, robots, feed, and JSON
   catalog smoke tests against the production deployment.
5. Confirm Google Merchant Center diagnostics after its next feed fetch, then request
   indexing only for changed public pages.

Migration audit note: the production `products` table does not yet contain the five new
identifier columns. Three older local migrations are byte-equivalent (apart from the final
newline) to remote migrations recorded under different timestamps, while other local and
remote entries require object-by-object verification. This explains the CLI divergence and
is not evidence that bulk `migration repair` is safe.

### Next safe work packages

- Reconcile migration history in a separately reviewed database change window.
- Populate verified manufacturer identifiers from supplier data; never manufacture GTIN,
  MPN, brand, or model values.
- Review image dimensions and storage usage before enabling a paid image-optimization
  path globally.
- Decide an explicit discontinued/out-of-stock policy before exposing inactive products;
  keep checkout and cart stock guards unchanged.
- Measure Search Console, Bing Webmaster Tools, Merchant Center, and AI citation changes
  weekly after deployment.

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
- Car tools and equipment guide is live at `/car-tools-equipment` with CollectionPage and FAQPage structured data.
- Car fluids and additives guide is live at `/car-fluids-additives` with CollectionPage and FAQPage structured data.

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
- Done: `/car-tools-equipment` - tools and emergency equipment.
- Done: `/car-fluids-additives` - fluids and additives.

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

- Done: improved product descriptions where they were short or duplicated.
- Done: added clearer product attributes where available: size, scent, color, use case, compatible area, and package quantity.
- Ensure variant choices are clear on-page and in structured data where practical.
- Consider exposing selected category/product summaries in machine-readable JSON if needed.

## Level 6: Keyword and intent mapping

Goal: make every important brand, category, and product-use query point to one clear target page.

- Done: created `docs/keyword-target-map-2026-05-31.md`.
- Done: added internal search-intent links from category guide pages to relevant `/shop?search=...` results.
- Use the map to decide which page should be strengthened for each keyword.
- Monitor Google Search Console and Bing Webmaster Tools weekly for impressions, clicks, and indexed pages.
- Avoid keyword stuffing; improve pages with useful explanations, real product examples, internal links, and structured data.

## Level 4: Trust and commerce signals

Goal: make the store safer to cite and easier to trust.

- Done: add shipping/delivery information page.
- Done: add contact/support page with official contact methods.
- Done: add concise ordering guide page.
- Keep return policy indexed and linked.

## Level 5: Measurement and iteration

Goal: improve based on real search behavior.

- Track Google Search Console queries that mention Cesar Store and category terms.
- Track Bing indexed pages and product crawl status.
- Re-check Merchant Center image and product page issues after crawler refreshes.
- Test AI answer visibility manually in ChatGPT, Bing Copilot, Perplexity, and Google AI results over time.

## Current next task

Move to measurement and keyword iteration: request indexing for the public HTML guide pages, then review Google/Bing queries weekly against the keyword target map.

Operational tracker: use `docs/search-indexing-and-google-services-2026-07-17.md`
as the fixed checklist for indexing URLs, Google services, Bing/IndexNow, and
weekly monitoring.

## July 2026 AI Visibility expansion plan

Goal: increase Cesar Store citations and non-branded discovery in Microsoft
Clarity AI Visibility, Microsoft Copilot, Bing, Google AI-style answers, and
other answer engines without touching checkout, cart, order, payment, stock, or
database logic.

### Priority AI citation queries

- Brand/entity: `متجر سيزر`, `Cesar Store`, `Cesar Shop`, `cesareshop`,
  `cesareshop.com`.
- Broad category: `اكسسوارات سيارات`, `اكسسوارات عربيات`,
  `متجر اكسسوارات سيارات`, `شراء اكسسوارات سيارات اون لاين`,
  `اكسسوارات سيارات في مصر`, `car accessories Egypt`,
  `car accessories online Egypt`.
- Car care: `منتجات عناية بالسيارات`, `car care products Egypt`.
- Cleaning: `منظفات سيارات`, `ملمع سيارات`, `car cleaning products Egypt`.
- Fresheners: `معطر سيارات`, `معطرات سيارات`, `car air fresheners Egypt`.
- Tools/accessories: `حامل موبايل سيارة`, `كابل بطارية سيارة`,
  `منفاخ سيارة`, `غطاء سيارة`, `مظلة سيارة`.

### Execution rules

- Strengthen `/search-guide` first because it is the safest page for brand,
  alias, and discovery vocabulary.
- Strengthen existing category guide pages before creating new pages.
- Use concise, useful Q&A and internal links; avoid keyword stuffing.
- Prefer content, metadata, structured data, `llms.txt`, and documentation
  updates.
- Do not change retail purchase flow, cart logic, checkout logic, payment
  logic, stock logic, wholesale order logic, or database schema as part of this
  plan.

### Monitoring

- Check Microsoft Clarity > AI Visibility weekly for:
  - new non-branded grounding queries,
  - cited pages,
  - share of authority,
  - competitor domains receiving citations.
- Check Bing Webmaster Tools and Google Search Console weekly for matching
  query impressions.
- Request indexing and IndexNow submission after meaningful content updates.

## July 2026 Local SEO and Bing Visibility Checklist

Goal: improve discovery for Cesar Store in Bing, Google Search, Google Maps,
AI answers, and product-shopping surfaces without using spam links or manual
Merchant Center product edits.

### Bing Webmaster Tools

- [x] Review the Bing top recommendation about insufficient high-quality backlinks.
- [x] Confirm the recommendation is domain-level backlink quality, not a code error.
- [x] Add an authenticated admin IndexNow submit action in `/admin/seo`.
- [ ] After Vercel deployment, open `/admin/seo` and submit IndexNow URLs to Bing.
- [ ] Confirm `https://www.cesareshop.com/sitemap.xml` is submitted and successful in Bing Sitemaps.
- [ ] Open Bing Backlinks report and capture current referring domains/pages.
- [ ] Open Similar Sites and use it only for backlink and competitor research.
- [ ] Defer Bing PubHub unless Cesar Store starts a real editorial/news content section.

### Backlink Growth

- [ ] Ensure the official website link is visible on Facebook Page.
- [ ] Ensure the official website link is visible on Instagram bio.
- [ ] Ensure the official website link is visible on TikTok bio if the account is active.
- [ ] Add or verify Cesar Store in Google Business Profile.
- [ ] Add or verify Cesar Store in Bing Places when possible.
- [ ] Share useful guide pages in social posts, not only the homepage:
  `/car-care`, `/car-accessories`, `/car-cleaning-products`,
  `/car-air-fresheners`, `/car-tools-equipment`, `/car-fluids-additives`.
- [ ] Look for real Egyptian/local business directories suitable for car
  accessories and ecommerce, avoiding paid spam backlink packages.
- [ ] Ask trusted suppliers, partners, or car-related pages to mention Cesar
  Store with a natural link when appropriate.

### Google Business Profile

- [x] Start Business Profile creation for `Cesar Store`.
- [x] Choose a suitable primary category. Preferred if available:
  `Car accessories store` or `Auto accessories store`; otherwise use
  `Auto parts store`.
- [x] Strengthen site-side `AutoPartsStore` structured data with product
  categories, local commerce signals, language, currency, and official links.
- [ ] For the location question, choose `Yes` only if customers can visit a
  public store/showroom/office during stated hours.
- [ ] Choose `No` if there is no public customer-visit location; then configure
  service area/delivery coverage instead.
- [ ] Add official website: `https://www.cesareshop.com`.
- [ ] Add the official retail phone number.
- [ ] Add business hours that can be honored.
- [ ] Add logo and real product/store photos where available.
- [ ] Complete Google verification later after visiting the warehouse/storage
  location to record the required verification video.
- [ ] After verification, add secondary categories if Google offers relevant
  options.

#### Deferred Google Business Profile video verification checklist

- [ ] Open the Business Profile on a mobile device while physically at the
  warehouse/storage or operating location.
- [ ] Record the video from Google Business Profile directly; do not pre-record
  offline and upload later.
- [ ] Make the video one continuous, unedited recording with no breaks.
- [ ] Keep the video at least 30 seconds long.
- [ ] Show location proof: street sign, building number, nearby landmarks, or
  recognizable neighboring businesses.
- [ ] Show business existence: Cesar Store products, workspace, storage shelves,
  packaging, branded materials, business cards, or branded apparel if available.
- [ ] Show management proof: unlocking/accessing the storage area, opening
  business-only assets, or showing non-sensitive business documents such as an
  invoice, permit, or utility bill matching the business name.
- [ ] Avoid filming bank details, tax/ID numbers, private personal information,
  or other people's faces.
- [ ] Upload the video and wait for Google's review, which can take up to 5
  business days.

### Weekly Monitoring

- [ ] Check Google Search Console indexed pages and product snippets.
- [ ] Check Bing indexed pages, IndexNow response, backlinks, and search queries.
- [ ] Check Google Merchant Center product feed health.
- [ ] Record any new errors or recommendations before making changes.
