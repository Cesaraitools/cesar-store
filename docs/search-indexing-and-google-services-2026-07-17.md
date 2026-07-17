# Cesar Store indexing and Google services tracker

Last updated: 2026-07-17

Purpose: keep one fixed operational list for search indexing and connected
Google services so progress is not lost between Cesar Store sessions.

Canonical site:

- https://www.cesareshop.com

Do not submit or promote:

- `http://` URLs.
- `https://cesareshop.com` without `www`.
- Admin, auth, cart, checkout, order, API, or private wholesale workflow URLs.

## Indexing priority list

### Priority A - request manual indexing first

Use Google Search Console URL Inspection and Bing URL Inspection for these
public HTML pages after meaningful SEO, AIO, or content updates:

1. https://www.cesareshop.com/
2. https://www.cesareshop.com/search-guide
3. https://www.cesareshop.com/about
4. https://www.cesareshop.com/faq
5. https://www.cesareshop.com/contact
6. https://www.cesareshop.com/shipping
7. https://www.cesareshop.com/ordering-guide
8. https://www.cesareshop.com/return-policy
9. https://www.cesareshop.com/shop
10. https://www.cesareshop.com/categories
11. https://www.cesareshop.com/car-care
12. https://www.cesareshop.com/car-cleaning-products
13. https://www.cesareshop.com/car-air-fresheners
14. https://www.cesareshop.com/car-accessories
15. https://www.cesareshop.com/car-tools-equipment
16. https://www.cesareshop.com/car-lighting-tools
17. https://www.cesareshop.com/car-fluids-additives

### Priority B - submit as discovery resources, not normal landing pages

Submit or verify these resources in the matching tool, but do not spend manual
URL Inspection quota on them as customer landing pages:

- https://www.cesareshop.com/sitemap.xml
- https://www.cesareshop.com/robots.txt
- https://www.cesareshop.com/llms.txt
- https://www.cesareshop.com/products.json
- https://www.cesareshop.com/google-products.tsv

Recommended handling:

- Google Search Console: submit `sitemap.xml`.
- Bing Webmaster Tools: submit `sitemap.xml`, then use IndexNow after updates.
- Google Merchant Center: use `google-products.tsv` as the product feed source.
- AI crawlers and answer engines: `llms.txt` and `products.json` are support
  resources, not the main pages customers should land on from search.

### Priority C - product URLs

Product URLs are dynamic and should be discovered from the live sitemap or
`products.json`.

Recommended handling:

- Let Google discover products through `sitemap.xml` and internal links.
- Use manual Google URL Inspection only for important products after a major
  title, description, image, price, or availability fix.
- Use Bing IndexNow from `/admin/seo` after product or guide-page updates.
- Do not submit deleted, inactive, or stale product IDs.

Current historical reference:

- `docs/search-indexing-batches-2026-05-29.md` recorded 229 sitemap URLs on
  2026-05-29.
- The live sitemap now generates active product URLs dynamically, so the exact
  product count should be refreshed from production when needed.

## Step-by-step indexing runbook

### Google Search Console

1. Open Google Search Console for `https://www.cesareshop.com`.
2. Open Sitemaps.
3. Submit or confirm: `https://www.cesareshop.com/sitemap.xml`.
4. Open URL Inspection.
5. Paste each Priority A URL, one at a time.
6. If the URL is indexable, click Request indexing.
7. Record any URL that shows blocked, redirect, not found, or duplicate
   canonical issues before changing code.
8. Do not manually inspect every product unless it is a priority product.

### Bing Webmaster Tools

1. Open Bing Webmaster Tools for `https://www.cesareshop.com`.
2. Confirm `https://www.cesareshop.com/sitemap.xml` exists under Sitemaps.
3. Use URL Inspection for the Priority A pages.
4. Open Cesar Store admin `/admin/seo`.
5. Click the Bing IndexNow submit action after confirming production is current.
6. Review IndexNow response and record failures.

### Weekly monitoring

- Google Search Console > Performance > Queries:
  brand terms, category terms, and new AI Visibility target queries.
- Google Search Console > Pages:
  guide pages indexed, product pages discovered, canonical issues.
- Bing Webmaster Tools:
  URL Inspection, IndexNow response, backlinks, keyword research.
- Microsoft Clarity > AI Visibility:
  share of authority, grounding queries, cited pages, competitor domains.
- Google Merchant Center:
  product feed health, image issues, disapprovals, product diagnostics.

## Connected Google services and project achievements

### Confirmed connected or implemented

| Service | Current state | Important IDs / notes |
| --- | --- | --- |
| Google Ads | Search campaign launched for Cesar Store. Purchase conversion became Active. | Ads account shown as `927-925-0682`; Google Ads ID `AW-18319168682`; purchase conversion label `t23-CLSDotEcEKqpoZ9E`. |
| Google tag / gtag.js | Installed in the Next.js layout and deployed. | Uses `NEXT_PUBLIC_GOOGLE_TAG_ID`; Ads tag currently `AW-18319168682`. |
| Google Analytics 4 | GA4 measurement support added to layout and deployed. | Web stream name `Cesar`; Measurement ID `G-KF46KLF26M`; wait up to 24-48 hours after tag changes for data collection status to clear. |
| Google Merchant Center feed | Site exposes a Merchant feed route. | Feed URL: `https://www.cesareshop.com/google-products.tsv`; product edits should happen in site/admin/source data, not manually in Merchant Center. |
| Google Business Profile | Setup started and site-side local/business schema strengthened. | Verification and business details are still pending based on the business location decision and video verification. |
| Google Customer Reviews opt-in | Checkout confirmation page contains opt-in integration code. | Verify live account/status separately before treating it as fully active. |
| Google Login | Login UI contains Google sign-in flow. | Auth provider status should be verified separately if login work resumes. |

### Search and discovery services to keep checking

| Service | Current state | Next action |
| --- | --- | --- |
| Google Search Console | Used for indexing and performance monitoring; live property status should be verified in browser before each indexing batch. | Submit/confirm sitemap, then request indexing for Priority A URLs. |
| Bing Webmaster Tools | Used for Bing indexing, URL inspection, backlink review, and IndexNow. | Confirm sitemap, run `/admin/seo` IndexNow, review URL Inspection. |
| Microsoft Clarity | Installed and collecting live user sessions; AI Visibility is active enough to show `متجر سيزر` citations. | Monitor AI Visibility weekly for non-branded queries and cited pages. |

## Open follow-ups

- Complete the manual indexing pass for Priority A URLs.
- Confirm Google Search Console sitemap status after Vercel finishes deployment.
- Confirm GA4 data collection clears after the deployed measurement ID is seen.
- Keep Google Ads campaign narrow; do not enable Search Partners, Display, broad
  match, AI Max, or Performance Max until data supports expansion.
- Finish Google Business Profile verification when the real operating location
  and video verification materials are ready.
