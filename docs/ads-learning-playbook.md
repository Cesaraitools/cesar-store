# Cesar Store Ads Learning Playbook

Last updated: 2026-07-20

## Purpose

This file stores practical advertising lessons that should guide Cesar Store
campaign work later. Source files such as PDFs, videos, exports, and local
course notes should stay outside Git. Only distilled, reusable operating rules
should be committed here.

Use this playbook for:

- Google Ads campaign repair and expansion.
- Meta/Facebook/Instagram campaign planning.
- Merchant Center, Analytics, and conversion-measurement decisions.
- Keeping ad learning tied to Cesar Store instead of generic theory.

## Source Log

| Date | Source | Topic | Status | Practical use |
| --- | --- | --- | --- | --- |
| 2026-07-20 | `Module-3_-Marketing-with-Facebook-Ads.pdf` | Marketing with Facebook Ads | Evidence-backed initial extraction | Objectives, audiences, budget, creative testing, and measurement rules for future Meta campaigns. |
| 2026-07-20 | `02A-DMA-GAW-Fundamentals-11-15-2019.pdf` | Google Ads fundamentals | Evidence-backed initial extraction | Search intent, account structure, ad groups, keyword discovery, and review workflow. |
| 2026-07-20 | `What-Is-Google-Ads.pdf` | Google Ads overview | Evidence-backed initial extraction | Search-first rationale, Quality Score, landing-page relevance, ad auction, and ad extensions. |
| 2026-07-20 | `Uncodemy_Google_Ads_Notes.pdf` and matching duplicate Uncodemy PDFs | Google Ads course notes | Low-confidence extraction; needs visual/manual review | Six Uncodemy files are identical by SHA256; do not use as a primary source until concrete sections are verified. |
| 2026-07-20 | User-provided professional Google Ads guide for 2025-2026 | Advanced Google Ads operating doctrine | Added as guidance | Funnel-first strategy, enhanced/offline conversions, data consolidation, cautious broad match, bidding discipline, audience observation, and optimization workflow. |

## Google Ads Principles

- Start from the conversion funnel, not from keywords. Keywords are only useful
  after the campaign has a clear business goal, conversion event, and expected
  customer value.
- Search campaigns are strongest when the customer already has commercial
  intent. Use Search first for buyers who are actively looking for a product,
  category, price, delivery, or store.
- Separate search intent into three buckets:
  - Informational: learning and comparison queries. Better for SEO, guides, and
    cautious low-budget tests.
  - Transactional: buy, order, price, delivery, near-me, and product-specific
    queries. Best for the first paid Search campaigns.
  - Branded: Cesar Store and brand-name queries. Keep separate so brand demand
    does not hide category performance.
- Account structure matters. A practical starting structure is one campaign,
  multiple focused ad groups, five to ten closely related keywords per ad
  group, two to five ads per ad group, and one matching landing page per ad
  group.
- Do not mix unrelated products in one ad group. Keyword, ad copy, and landing
  page must all say the same thing.
- Quality Score depends mainly on expected CTR, ad relevance, and landing-page
  experience. For Cesar Store this means every ad group needs:
  - Keywords that match one product category or use case.
  - Ad copy that repeats the same category/use case naturally.
  - A landing page that actually shows that category or explains it clearly.
- Recommendations and optimization score should be reviewed weekly, not applied
  blindly. A high score is useful only when it matches the business strategy and
  budget constraints.
- Search Partners, Display expansion, AI Max, dynamic URL expansion, and broad
  automation can increase reach, but should stay controlled until the account
  has reliable conversion and search-term data.
- CPC is a cost control metric. CTR shows ad/query fit. Conversion rate shows
  landing-page and offer fit. CPA shows whether the traffic is worth buying.
- Use Search Terms reports to add negative keywords quickly. This is more
  important in a young account than expanding spend.
- Budget changes require explicit approval. Scaling should follow evidence, not
  platform pressure.
- Avoid large frequent changes. Budget or bid-strategy changes above roughly
  15-20% per week can disturb learning and make results harder to interpret.
- Broad match is an advanced tool, not a beginner default. It should only be
  tested after conversion tracking is reliable, negative keyword hygiene is
  strong, and bidding strategy has enough data.
- Prefer conversion value optimization only after order values and purchase
  tracking are trustworthy. Until then, click and conversion data should be
  treated as learning signals, not proof of profitability.
- Use audience layers in Observation mode to learn which in-market or affinity
  segments convert better before changing targeting aggressively.
- Quality Score work is operational: improve landing-page relevance, expected
  CTR, and ad relevance together. Do not try to fix Quality Score from only one
  side.
- RSA asset details must be reviewed. Replace weak headlines/descriptions
  instead of leaving Google's combinations unattended forever.
- Ad scheduling should be driven by evidence. Concentrate spend only after the
  account shows which days and hours produce cheaper useful actions.
- Display and YouTube need stricter exclusions than Search, especially app
  placements, children's/gaming inventory, and low-intent accidental clicks.

## Cesar Store Google Ads Repair Model

Original repair strategy for Cesar Store was:

1. Keep the existing Search campaign, but clean it before scaling.
2. Keep the budget conservative until there are useful search terms and
   conversion signals.
3. Build focused ad groups by the site's real product sections.
4. Use phrase and exact match first. Avoid broad match at the beginning.
5. Give every ad group a matching category landing page.
6. Write Arabic-first ads for Egypt, with English variants only where the
   category naturally receives English searches.
7. Review Search Terms daily during the first active week.
8. Treat broad match, AI Max, Search Partners, Display expansion, and value
   bidding as later controlled tests, not as the default launch state.
9. Keep a shared negative keyword list and update it every week from real search
   terms.
10. Do not scale from clicks alone. Require evidence from useful actions such as
    add to cart, purchase, WhatsApp contact, or strong category engagement.

After the campaign was restructured into multiple ad groups, this section is a
reference model only. The active task is to verify the current ad groups,
landing pages, keywords, ads, and settings against
`docs/google-ads-campaign-diagnostic-plan-2026-07-21.md`, not to assume the
campaign is still in its original one-ad-group state.

Suggested Search ad groups:

| Ad group | Search intent | Landing page | Keyword direction |
| --- | --- | --- | --- |
| Car accessories | General buyers looking for car accessories online | `https://www.cesareshop.com/shop?category=cars-accessories` or `/car-accessories` | "اكسسوارات سيارات", [اكسسوارات سيارات], "اكسسوارات عربيات", "car accessories egypt" |
| Air fresheners | Buyers looking for car perfumes and smell solutions | `https://www.cesareshop.com/car-air-fresheners` | "معطر سيارات", [معطر سيارات], "معطرات سيارات", "car air freshener egypt" |
| Cleaning and detailing | Buyers looking for car cleaning and shine products | `https://www.cesareshop.com/car-cleaning-products` | "منظفات سيارات", "ملمع سيارات", "car cleaning products egypt" |
| Lighting and visibility | Buyers looking for lights or visibility accessories | `https://www.cesareshop.com/car-lighting-tools` | "اضاءة سيارات", "لمبات سيارات", "car led lights egypt" |
| Tools and emergency | Buyers looking for compressors, jump cables, and road tools | `https://www.cesareshop.com/car-tools-equipment` | "منفاخ سيارة", "كابل بطارية سيارة", "عدة سيارة" |
| Fluids and additives | Buyers looking for helper fluids and maintenance products | `https://www.cesareshop.com/car-fluids-additives` | "سوائل سيارات", "اضافات سيارات", "car fluids egypt" |
| Store brand | People searching for Cesar Store directly | `https://www.cesareshop.com/` | "متجر سيزر", [متجر سيزر], "cesar store", "cesareshop" |

## Google Ads Execution Checklist

Before changing a campaign:

1. Confirm campaign status, daily budget, objective, bid strategy, location, and
   languages.
2. Confirm Search Partners, Display Network, AI Max, final URL expansion, and
   dynamic assets are intentionally enabled or disabled.
3. Export or screenshot the current campaign/ad group state before major edits.
4. Create or repair one ad group at a time.
5. Add only tightly related phrase/exact keywords.
6. Add relevant negative keywords.
7. Use one landing page per ad group.
8. Add sitelinks and assets that match real pages.
9. Save, then check diagnostics and policy status.
10. Wait for data before making another major change.
11. Record the change reason so later performance shifts can be understood.
12. Keep advertiser identity and business-name settings stable unless the owner
    explicitly changes them.

## Google Ads Monitoring Checklist

Daily during the first week:

- Cost.
- Impressions.
- Clicks.
- CTR.
- CPC.
- Search Terms.
- Add to cart.
- Purchases.
- Conversion tracking status.
- Disapproved or limited ads/products.
- Landing-page errors or slow pages.

Weekly:

- Review Recommendations manually.
- Add negative keywords.
- Pause weak keywords or ads only after enough data.
- Compare ad groups separately, not just campaign totals.
- Check Merchant Center product approvals and feed quality.
- Check Search Console indexing and product snippet errors.
- Review RSA asset performance and replace Low assets.
- Review audiences in Observation mode.
- Review day/hour performance before changing ad scheduling.
- Avoid increasing budget more than about 15-20% unless there is a clear reason
  and explicit budget approval.

## Advanced Google Ads Roadmap

These are not first-day tasks for Cesar Store, but they are the direction to
grow into:

1. Enhanced Conversions: use first-party customer data only through compliant,
   secure implementation, never through chat or exposed secrets.
2. Offline Conversions: later connect real fulfilled orders or qualified leads
   back to Google Ads so optimization learns from real business value.
3. Data consolidation: avoid over-fragmented ad groups when the account does not
   have enough conversion volume. Use focused STAG-style groups first, then
   consolidate when data supports it.
4. Conversion value bidding: move from clicks to conversions, then to conversion
   value only when tracking and order values are stable.
5. Seasonality adjustments: use only for short, real promotions where conversion
   rate is expected to change materially.
6. Google Ads Editor: use later for bulk campaign restructuring after the manual
   structure is proven.
7. Looker Studio: build a dashboard once core metrics are reliable.
8. Scripts: only after manual rules are clear, for alerts or pausing wasteful
   spend patterns.

## Meta/Facebook Ads Principles

- Choose the campaign objective before anything else. The objective determines
  what the platform optimizes for and which metrics matter.
- Start new campaigns with a small test budget, then scale only after there is
  evidence from clicks, actions, messages, carts, or purchases.
- Keep first audiences targeted. Very broad targeting can waste spend before
  the account has enough signal.
- Use Core Audiences first: location, age, gender, language, interests,
  behaviors, and relevant connections.
- Use Custom Audiences after there is enough useful traffic, customer, app, or
  engagement data.
- Use Lookalike Audiences later, after the source audience is strong enough to
  represent good customers.
- Prepare at least two or three creatives per campaign or ad set so performance
  can be compared.
- Rotate or refresh creatives when frequency becomes high or performance drops.
- Strong ads are visual, relevant, valuable, and have a clear call to action.
- Track Actions, Cost per Action, Spend, and Frequency, not only impressions.
- A frequency near 5 or higher can indicate ad fatigue and should trigger a
  creative or audience review.
- CPC is better when the goal is a click or action. CPM is more suitable for
  reach and awareness.
- Use account spending limits or clear budget controls to avoid surprise spend.

## Cesar Store Meta Ads Application

- Do not copy the Google Search structure blindly into Meta. Search captures
  existing intent, while Meta is better for demand creation, visual product
  discovery, retargeting, and message-led selling.
- Use Arabic-first copy for Egypt unless a specific audience or product group
  clearly needs English.
- Keep claims specific and believable. Do not use unsupported urgency,
  unrealistic guarantees, or exaggerated product promises.
- First Meta campaign objectives should be selected according to tracking
  readiness:
  - Traffic is acceptable for early learning if conversion tracking is not yet
    fully trusted.
  - Sales or Conversions should wait until Pixel/CAPI and purchase/add-to-cart
    signals are confirmed.
  - Messages can be useful if WhatsApp or Messenger handling is ready.
  - Catalog Sales should wait until catalog quality and events are stable.
- Suggested first ad-set structure by product intent:
  - Car air fresheners and interior smell solutions.
  - Car cleaning, detailing, towels, and shine products.
  - Practical interior accessories and phone holders.
  - Car lighting and visibility products.
  - Emergency tools, compressors, battery cables, and road-use tools.
  - Fluids, additives, and maintenance helpers.
- Each ad set should have a matching landing page or category page and creatives
  that show the actual product or use case clearly.

## Campaign Setup Checklist

Before launching a Meta campaign:

1. Define the business objective.
2. Define the exact target action: visit, message, add to cart, purchase, or
   lead.
3. Confirm the landing page or WhatsApp/Messenger destination.
4. Choose the audience type: Core, Custom, or Lookalike.
5. Set location and language.
6. Set a small test budget and schedule.
7. Prepare at least two or three creatives.
8. Write a clear CTA.
9. Confirm tracking events and URL parameters.
10. Set monitoring rules before launch.

## Measurement Checklist

Review campaigns by:

- Spend.
- Clicks and CTR.
- CPC.
- Add to cart.
- Purchases.
- Messages or leads, when the campaign objective is message or lead based.
- CPA or cost per useful action.
- Frequency.
- Audience breakdown by age, gender, location, and placement.
- Creative fatigue.
- Quality of comments and messages.

## Open Backlog

- Use `docs/google-ads-campaign-diagnostic-plan-2026-07-21.md` as the active
  checklist before making further Google Ads edits.
- Audit Meta Pixel and Conversion API status before launching serious sales
  campaigns.
- Prepare product media sets for each core category.
- Confirm WhatsApp and Messenger operations before running message campaigns.
- Build Cesar Store-specific Meta campaign structure after the Google Ads
  Search campaign is cleaned up.
- Keep Google Ads and Meta Ads learning separate because the intent model is
  different.
