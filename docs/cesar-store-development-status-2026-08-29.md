# Cesar Store Development Status

Last reviewed: 2026-08-29

Purpose: provide one current execution list for Cesar Store, replacing the need
to infer present status from several older roadmaps. Older documents remain the
detailed implementation references; this file is the current routing summary.

## Status meanings

- **Complete:** verified in the current repository and, where public, checked on
  production.
- **Next:** safe work that can be executed now in the listed order.
- **Blocked:** requires a live account dashboard, physical location, controlled
  external test, owner decision, or third-party approval.
- **Deferred:** intentionally postponed until the prerequisite data or business
  need exists.

## Evidence used for this review

- Repository: `main` was clean and matched `origin/main` at commit `9945509`.
- Public production checks on 2026-08-29 returned HTTP 200 for `/`, `/shop`,
  `/wholesale`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/products.json`,
  and `/google-products.tsv`.
- Live discovery counts:
  - `sitemap.xml`: 268 URLs.
  - `/products.json`: 249 products.
  - `/google-products.tsv`: 249 product rows.
  - `/shop` initial HTML: 249 unique product links.
- The mobile-performance deployment is visible in production: the smaller
  `/icon-192.png` navbar asset is served, and the hero image is preloaded with
  high priority.
- Last Google Search Console evidence supplied on 2026-08-27 showed 219 indexed
  pages and 143 not indexed pages. This dashboard count must be refreshed before
  treating it as the current count.
- Last mobile PageSpeed evidence supplied before the performance deployment was:
  score 56, FCP 2.9 s, LCP 6.0 s, TBT 550 ms, and CLS 0.009.
- Account-only states below are not marked complete unless supported by a recent
  dashboard check or controlled test.

## Complete

### Search, indexing, and AI discovery foundation

- Canonical production domain is `https://www.cesareshop.com`.
- Public `robots.txt`, dynamic `sitemap.xml`, `llms.txt`, `products.json`, and
  Merchant TSV feed are live.
- Public trust and guide pages are implemented: About, FAQ, contact, shipping,
  ordering guide, return policy, search guide, and the seven main car-category
  guide pages.
- Product, breadcrumb, organization/store, collection, and FAQ structured data
  are implemented in the appropriate pages.
- Active products are linked in server-rendered `/shop` HTML, fixing the former
  client-only discovery gap.
- Product snippet notices for missing `review` and `aggregateRating` are optional
  notices, not blocking errors. Do not add invented reviews or ratings.
- IndexNow has an authenticated admin submission action.

### Product data and Merchant feed source

- Existing product descriptions were enriched in Arabic and English without
  changing names, prices, stock, images, or variants.
- Machine-readable product attributes are generated in `products.json`.
- Merchant Center is fed from `/google-products.tsv`; product data should remain
  managed from the store source/admin rather than edited manually in Merchant
  Center.
- The current public JSON and TSV sources both expose 249 active feed items.

### Mobile performance first pass

- Initial mobile hero animations no longer delay first-paint visibility.
- The navbar logo transfer was reduced from about 356 KB to about 30 KB using an
  existing brand asset.
- Non-critical category-slide loading waits until the page load has completed.
- Microsoft Clarity loads with `lazyOnload`; Google Ads tracking was not delayed
  or removed.
- The homepage heading sequence was corrected for accessibility.
- TypeScript and lint completed successfully before commit `9945509` was pushed.

### Wholesale core and admin

- Wholesale application, document upload, review, approval/account linking,
  protected catalog, DB-backed cart, atomic order creation, variants, status
  flow, stock deduction/restore, customer order history, returns, and the main
  wholesale admin pages are implemented separately from retail logic.
- Wholesale admin overview, customers, orders, archive, returns, analytics,
  charts, reports, settings, product overlay, CSV/report workflows, and protected
  test reset are present.
- The archive/add-item migration and matching UI were enabled in July 2026. The
  later "pending SQL" paragraph in `docs/wholesale-roadmap.md` is stale and must
  not override the later commit history and completion notes.
- Wholesale print reports and QR tracking exist. The current wholesale report is
  print-friendly HTML, not a generated PDF binary.

### Monitoring and integrations implemented in code

- Google tag, GA4 support, Google Ads ecommerce events, and purchase conversion
  support are implemented.
- Sentry client, server, edge, request-error capture, error replay, and selected
  order/admin error capture are implemented.
- Microsoft Clarity is installed.
- Browser Google sign-in exists; mobile/installed-app Google sign-in remains
  intentionally hidden while email/password remains available.

## Next — execution order

### 1. Verify the mobile performance deployment

- Run a fresh PageSpeed mobile test after deployment.
- Record the new score, FCP, LCP, TBT, CLS, image-delivery savings, unused JS,
  and render-blocking requests beside the 2026-08-27 baseline.
- Only make another code change if the new report identifies a specific current
  bottleneck; preserve retail behavior and conversion tracking.

### 2. Audit desktop performance

- Start only after recording the post-deployment mobile result.
- Review desktop LCP, main-thread work, image delivery, render blocking, and
  third-party cost separately; do not assume the mobile bottleneck is identical.

### 3. Continue Search Console validation and indexing monitoring

- Refresh the Pages report and compare it with the 2026-08-27 baseline of
  219 indexed / 143 not indexed.
- Check the validation groups already started for discovered-not-indexed, 5xx,
  redirect error, and duplicate-without-selected-canonical pages.
- Treat intentional canonical redirects, private robots blocks, deleted-product
  404s, and valid alternate canonicals separately from actionable failures.
- Use sitemap/internal discovery for products; reserve manual inspection for
  important products and Priority A public pages.

### 4. Verify Bing, IndexNow, Merchant Center, GA4, and Clarity dashboards

- Confirm Bing sitemap success and submit IndexNow after meaningful changes.
- Record Bing indexed pages, queries, and referring domains.
- Confirm Merchant feed fetch status, 249-item processing result, disapprovals,
  image problems, and landing-page issues.
- Confirm GA4 data collection and purchase/add-to-cart event quality.
- Record Clarity AI Visibility non-branded queries, cited pages, and competitors.

### 5. Finish the Meta child-photo comment lane

- Current code supports normal comment replies, contextual parent-comment use,
  public price safety, and private price replies.
- The normalizer still explicitly rejects feed changes where
  `value.item !== "comment"`; therefore the historical child-photo
  `not_a_comment` gap is not proven fixed.
- Capture one sanitized controlled child-photo payload, implement only the
  confirmed shape, then test exact-comment reply, photo/parent grounding,
  deduplication, page-authored comments, and human handoff behavior.

### 6. Take a live Google Ads snapshot before any campaign edit

- Capture current campaign settings, networks, AI Max/final URL expansion,
  ad groups, keywords, search terms, ads/assets, landing pages, conversions,
  budget, and Merchant status.
- Verify purchase values and business outcomes before changing bidding or
  scaling budget.
- Make only evidence-backed corrections after the snapshot.

### 7. Ongoing product and search-quality maintenance

- Review descriptions and attributes for products added after the May 2026
  enrichment run; do not assume newer products inherited manual QA.
- Use Search Console/Bing queries to strengthen existing category guides and
  `/search-guide` before creating more pages.
- Keep weekly Sentry monitoring after deployments and investigate real
  application errors before broad refactors.

## Blocked

### Requires account-dashboard verification

- Exact current Google Search Console index counts and validation outcomes.
- Bing sitemap, IndexNow, backlinks, and query status.
- Merchant Center processing/disapproval status.
- GA4 live collection and ecommerce event quality.
- Clarity AI Visibility metrics.
- Google Ads campaign serving, conversion quality, search terms, and current
  configuration.
- Current Sentry unresolved issue list.

These are not code blockers; they are evidence blockers. Do not label them
healthy or broken without a current dashboard snapshot.

### Requires controlled external testing or owner action

- Meta child-photo automation completion requires a sanitized real webhook
  payload and controlled Facebook comment tests.
- Publishing the Meta app or changing permissions/subscriptions requires the
  appropriate Meta review and explicit authorization.
- Re-enabling Google sign-in on mobile requires real-device browser/installed-app
  testing of redirects, popup/cookie behavior, and fallback login.
- Google Business Profile completion requires the final location/service-area
  decision, real business details, and physical-location video verification.
- Social profile backlinks require owner access to Facebook, Instagram, TikTok,
  Bing Places, suppliers, or directory profiles.

## Deferred

- Google Ads broad match, AI Max, Display expansion, Performance Max, conversion
  value bidding, and aggressive budget scaling until conversion and business
  value data are trustworthy.
- Automatic wholesale WhatsApp delivery until an approved provider and consent
  workflow are selected; keep the current prepared-message/manual flow.
- Bing PubHub unless Cesar Store launches a genuine editorial/news section.
- Adapting wholesale returns to retail until wholesale returns are stable and a
  separate retail change is explicitly approved.
- Converting the wholesale print report into a generated PDF binary until Arabic
  shaping/layout requirements are reviewed; print/save-as-PDF remains available.
- Google Business Profile secondary-category expansion until verification is
  complete.

## Safety boundaries for every next step

- Stay in `D:\mohamed adel work\cesar-store` and use the `cesaraitools` remote.
- Do not ask for or commit secrets.
- Do not run `supabase db push` blindly; review and apply SQL one migration at a
  time with explicit approval.
- Keep indexing, AI visibility, advertising diagnostics, and performance work
  isolated from healthy retail cart, checkout, payment, order, and stock logic.
- Prefer `npx tsc --noEmit --incremental false`, `npm run lint`, and
  `git diff --check`; do not run a local production build unless requested.
- Treat each implementation as a small reviewed commit with production
  verification appropriate to its risk.

