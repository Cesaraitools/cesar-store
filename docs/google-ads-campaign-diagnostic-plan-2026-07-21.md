# Cesar Store Google Ads Campaign Diagnostic Plan

Last updated: 2026-07-21

## Purpose

This document turns the advertising learning materials into an operational
follow-up plan for the Cesar Store Google Ads campaign after the campaign was
restructured into multiple ad groups. It is not a replacement for live account
verification. Any budget, bidding, network, or automation change must be
confirmed inside Google Ads before action.

## Source Basis

This plan is based on:

- `docs/ads-learning-source-audit-2026-07-20.md`
- `docs/ads-learning-playbook.md`
- User-provided advanced Google Ads guidance for 2025-2026
- Current Cesar Store continuity rules and prior campaign screenshots

Evidence-backed rules already extracted:

- Separate informational, transactional, and branded search intent.
- Build account structure around focused ad groups, matching ads, and matching
  landing pages.
- Use five to ten closely related keywords per ad group as an initial guide.
- Quality Score depends on expected CTR, ad relevance, and landing-page
  experience.
- Search Terms review and negative keyword hygiene are recurring work, not a
  one-time setup.
- Broad match, AI Max, final URL expansion, Search Partners, and Display
  expansion are advanced levers and should not be enabled blindly in a young
  account.

## Current Risk Hypotheses

These are not final conclusions until verified live in Google Ads:

1. The campaign was originally too concentrated because it started with one ad
   group; after the later restructuring, the current task is to verify that the
   new ad groups are correctly separated by category, intent, keyword set, ad
   copy, and landing page.
2. The campaign settings may have drifted from the original controlled setup,
   especially Search Partners, Display Network, AI Max, dynamic assets, and URL
   expansion.
3. Budget and bidding may have changed without enough performance data to judge
   the effect.
4. The campaign has had very low traffic signals in the screenshots, so
   conclusions from performance metrics are weak until fresh data is available.
5. Keyword and final URL configuration may be mixed between campaign-level and
   ad-group-level settings.
6. Merchant Center has mostly approved products, but product/feed and Search
   Console enhancement issues can still reduce Shopping/organic trust.
7. Conversion tracking exists, but purchase volume may be too low for smart
   bidding, broad match, or conversion value optimization.

## Historical Baseline From Pre-Restructure Keyword Report

Local report reviewed:

- File: `C:\Users\Ahmed Ali\Downloads\تقرير كلمات البحث الرئيسية.csv`
- Period: 2026-07-13 to 2026-07-16

Important limitation:

- This report is a historical baseline from before the later campaign
  restructuring work. It must not be treated as proof of the current ad-group
  state after the newer edits.

Observed from the report:

- Total keyword impressions: 13.
- Clicks: 0.
- Cost: EGP 0.00.
- Active keywords by match type:
  - Broad / approximate match: 10.
  - Phrase match: 11.
  - Exact match: 2.
- Keywords that received impressions:
  - `اكسسوارات عربيات`, broad, 1 impression.
  - `"منتجات سيارات"`, phrase, 1 impression.
  - `منتجات سيارات`, broad, 1 impression.
  - `"اكسسوارات سيارات"`, phrase, 5 impressions.
  - `اكسسوارات سيارات`, broad, 3 impressions.
  - `"اكسسوارات عربيات"`, phrase, 2 impressions.
- Keywords marked as rarely showing ads:
  - `"اكسسوارات سيارة اون لاين"`.
  - `"buy car accessories egypt"`.

Interpretation:

- The early failure signal is not wasted spend. The campaign did not spend and
  did not get clicks in this report period.
- The campaign also did not collect enough data to justify smart bidding,
  broad-match expansion, or aggressive budget changes.
- The old mix of broad, phrase, and exact terms in one broad product ad group
  explains why the original campaign was hard to diagnose.
- After the later restructuring, the immediate work is not to rebuild from zero.
  It is to verify the new ad groups, confirm serving eligibility, check
  search-intent fit, and monitor whether the new structure starts collecting
  useful impressions, clicks, and conversion signals.

## Diagnostic Workflow

### 1. Measurement Foundation

Check:

- Google tag status.
- Purchase conversion status.
- GA4 data collection.
- Merchant Center feed status.
- Add-to-cart and purchase events, if visible.

Weakness signals:

- Conversion action active but no recent conversions.
- Clicks or visits exist without GA4 sessions.
- Purchase event records wrong value, currency, or duplicates.
- Merchant products disapproved, limited, or missing prices/images.

Action:

- Fix tracking and feed issues before scaling.
- Do not switch to Target ROAS or conversion value bidding until purchase value
  tracking is trustworthy.
- Enhanced conversions and offline conversions are future work only through a
  secure implementation path, not through chat or exposed secrets.

### 2. Campaign Settings

Check:

- Campaign status.
- Daily budget.
- Objective.
- Bid strategy.
- Networks.
- Location.
- Language.
- AI Max.
- Final URL expansion.
- Automatically created assets.
- Dynamic search-style options.

Weakness signals:

- Search Partners or Display Network enabled without intentional testing.
- AI Max or final URL expansion enabled before the account has enough reliable
  conversion/search-term data.
- Budget changed aggressively without a recorded reason.
- Location broader than Egypt.
- Language or URL settings inconsistent with the landing pages.

Action:

- Keep Search-only controlled while the account is still learning.
- Keep budget changes within roughly 15-20 percent per week unless the user
  explicitly approves a larger move.
- Do not change budget without direct approval.

### 3. Campaign Structure

Check:

- Number of ad groups.
- Each ad group's landing page.
- Whether keywords, ad copy, and landing page all match one intent.

Weakness signals:

- One ad group contains many unrelated product types.
- Keywords point to generic `/shop` when a better category page exists.
- Category terms and brand terms are mixed in the same ad group.
- English and Arabic keywords are mixed without intent or category separation.

Action:

- Audit the current ad groups that were created during the restructuring.
- Confirm every current ad group has a matching landing page, keyword theme,
  and ad message.
- Use phrase and exact match first.
- Keep broad match off until search-term quality and conversion tracking prove
  reliable.

## Cesar Store Search Ad Group Map

Validate every landing page live before using it in Google Ads.

| Priority | Ad group concept | Search intent | Candidate landing page | Initial match types |
| --- | --- | --- | --- | --- |
| 1 | Car accessories | General buyers looking for car accessories online | `https://www.cesareshop.com/shop?category=cars-accessories` | Phrase and exact |
| 2 | Car air fresheners | Buyers looking for car perfume, smell, and interior scent products | Category page or filtered shop page for air fresheners | Phrase and exact |
| 3 | Car cleaning products | Buyers looking for cleaning, shine, towels, and detailing products | Category page or filtered shop page for cleaning products | Phrase and exact |
| 4 | Car lighting | Buyers looking for LED lights and visibility accessories | Category page or filtered shop page for lighting products | Phrase and exact |
| 5 | Car tools and emergency | Buyers looking for compressor, battery cable, emergency, and road tools | Category page or filtered shop page for tools/equipment | Phrase and exact |
| 6 | Fluids and additives | Buyers looking for car fluids, additives, and maintenance helpers | Category page or filtered shop page for fluids/additives | Phrase and exact |
| 7 | Cesar Store brand | People already searching for Cesar Store | `https://www.cesareshop.com/` | Exact and phrase |

## Keyword Hygiene

Check:

- Current keywords.
- Search Terms report.
- Negative keyword list.
- Match types.

Weakness signals:

- Broad keywords consuming budget before data exists.
- Informational searches triggering buyer ads.
- Searches for free, used, PDF, jobs, wholesale-only, manufacturing, or images.
- Duplicate or near-duplicate keywords across ad groups.

Action:

- Classify every new keyword as informational, transactional, or branded.
- Add high-intent transactional terms first.
- Keep a shared negative keyword list and update it weekly.
- Do not add broad match until the account has clean search terms and reliable
  conversions.

## Ads And Assets

Check:

- Responsive Search Ad headlines and descriptions.
- Asset details after data appears.
- Sitelinks.
- Callouts.
- Structured snippets.
- Business name and advertiser identity.

Weakness signals:

- Generic ad text that could apply to any store.
- Ad copy promises products or categories not visible on the landing page.
- RSA assets marked Low after enough impressions.
- Sitelinks pointing to weak or unrelated pages.

Action:

- Write ads per ad group, not one generic ad for all categories.
- Keep business name and advertiser identity stable.
- Replace weak RSA assets after evidence appears.
- Use assets only when they point to real, useful pages.

## Landing Pages

Check:

- Page relevance.
- Product availability.
- Category filtering.
- Loading speed.
- Structured data and Merchant consistency.
- Mobile usability.

Weakness signals:

- Ad group sends users to a page that does not show the promised product type.
- Empty category results.
- Product snippet errors or Merchant feed mismatch.
- Page indexed but with enhancement issues.

Action:

- Prefer the most specific working category page.
- If category pages are weak, repair SEO/content/category filtering before
  spending heavily on that ad group.
- Keep Search Console and Merchant Center issues in the SEO/Merchant backlog,
  but do not ignore them when paid traffic underperforms.

## Monitoring Cadence

Daily during early repair:

- Cost.
- Impressions.
- Clicks.
- CTR.
- CPC.
- Search Terms.
- Add to cart.
- Purchases.
- Conversion status.
- Disapproved or limited ads/products.

Weekly:

- Negative keyword update.
- Ad group comparison.
- Recommendations review without blind auto-apply.
- Merchant product status.
- Search Console product and indexing issues.
- RSA asset details.
- Audience observations.
- Day/hour performance only after enough data.

## Change Control Rules

- Snapshot current settings before changing the campaign.
- Change one major area at a time.
- Do not adjust budget without user approval.
- Do not apply platform recommendations blindly.
- Do not enable Performance Max yet.
- Do not enable broad match yet.
- Do not switch to conversion value bidding until purchase values are verified.
- Do not make large budget or bidding changes repeatedly during learning.
- Record every major change and the reason for it.

## First Live Audit Checklist

| Area | What to verify | Weakness signal | Decision |
| --- | --- | --- | --- |
| Campaign status | Enabled, paused, learning, limited | Not serving or unintentionally paused | Confirm current state before edits |
| Budget | Daily budget and recent spend | Budget too high for evidence or no spend at all | Ask before changing |
| Networks | Search, Search Partners, Display | Partners/Display enabled unintentionally | Disable unless intentional test |
| AI Max and URL expansion | AI Max, text customization, final URL expansion | Enabled before data quality is ready | Keep off for now |
| Ad groups | Count and themes | One broad ad group only | Split into category intent groups |
| Keywords | Match types and grouping | Broad or mixed unrelated terms | Clean by intent and category |
| Search terms | Real queries that triggered ads | Irrelevant searches | Add negatives |
| Ads | RSA assets and landing-page fit | Generic or weak assets | Rewrite per ad group |
| Landing pages | Category page fit | Generic or empty page | Use or create better destination |
| Conversions | Purchase/add-to-cart events | No data or wrong values | Fix before smart bidding |
| Merchant | Product approval and feed quality | Disapproved/limited products | Fix feed/product data |
| Search Console | Indexing and rich-result issues | Product snippets invalid | Track as SEO/Merchant dependency |

## Immediate Next Step

Before editing Google Ads again, collect a current live post-restructure
snapshot from:

1. Campaign settings.
2. Ad groups list.
3. Keywords list.
4. Search terms report.
5. Ads and assets.
6. Landing pages or final URLs.
7. Conversions page.
8. Merchant Center product status.

After that snapshot, follow-up order should be:

1. Confirm campaign is serving and settings are controlled.
2. Correct networks/AI Max/final URL expansion if they drifted.
3. Review the ad groups created in the restructuring and fix only mismatches.
4. Add or remove keywords and negatives per group based on intent.
5. Rewrite weak ads only where the current ad does not match the group.
6. Monitor daily for search-term quality before increasing spend.
