# Ads Learning Source Audit - 2026-07-20

Purpose: make the advertising learning work auditable. This file separates
what was actually extracted from PDFs, what came from user-provided guidance,
and what still needs deeper review before being used as campaign doctrine.

## Honesty Note

The first pass was not a full expert-level study of every page. It was a text
extraction and synthesis pass. The useful material below is evidence-backed by
page hits from the files, but any future campaign rebuild should still verify
live Google Ads, Merchant Center, Search Console, and Analytics data before
making budget or bidding decisions.

## Source Inventory

| Source | Pages | SHA256 | Review status |
| --- | ---: | --- | --- |
| `Module-3_-Marketing-with-Facebook-Ads.pdf` | 80 | `3371922792E7D68ED74000AD96B044F3502A31A17DBCB36A6ABD2C544A60153B` | Evidence-backed initial extraction |
| `02A-DMA-GAW-Fundamentals-11-15-2019.pdf` | 71 | `DC3ABB411242BF7BC70CDA90478BA151BB56B45E1322A088D70CFD33D5220D5F` | Evidence-backed initial extraction |
| `What-Is-Google-Ads.pdf` | 34 | `829CBFE0726FF1CAB297838B01C5A1A4773E7BF5D907FE72946E3465CA9BD9D7` | Evidence-backed initial extraction |
| `Uncodemy_Google_Ads_Notes.pdf` | 28 | `98B03A2BBC7C283235437261142C80EDB4703820A2D5B1BEEA42C04F93A6C23F` | Low-confidence extraction; needs visual/manual review |
| `Uncodemy_Cheat_Sheet.pdf` | 28 | `98B03A2BBC7C283235437261142C80EDB4703820A2D5B1BEEA42C04F93A6C23F` | Duplicate of the same Uncodemy file |
| `Uncodemy_Real_World_Projects.pdf` | 28 | `98B03A2BBC7C283235437261142C80EDB4703820A2D5B1BEEA42C04F93A6C23F` | Duplicate of the same Uncodemy file |
| `Uncodemy_Project_Guide.pdf` | 28 | `98B03A2BBC7C283235437261142C80EDB4703820A2D5B1BEEA42C04F93A6C23F` | Duplicate of the same Uncodemy file |
| `Uncodemy_Advanced_Google_Ads.pdf` | 28 | `98B03A2BBC7C283235437261142C80EDB4703820A2D5B1BEEA42C04F93A6C23F` | Duplicate of the same Uncodemy file |
| `Uncodemy_Intro_Google_Ads.pdf` | 28 | `98B03A2BBC7C283235437261142C80EDB4703820A2D5B1BEEA42C04F93A6C23F` | Duplicate of the same Uncodemy file |

## Evidence Extracted From PDFs

### Meta/Facebook Ads Module

Evidence:

- Page 22: Core Audiences, Custom Audiences, and Lookalike Audiences.
- Page 26: Custom Audiences from people who already know the business.
- Page 27: Lookalike Audiences based on existing customer/contact signals.
- Pages 73-74: monitor Actions, Cost Per Action, Spend, and Frequency.
- Page 78: use Ads Manager to monitor objective-specific results and frequency.

Operational decisions for Cesar Store:

- Start Meta with clear objective and small tests.
- Use Core Audiences first.
- Delay Custom/Lookalike audiences until traffic, customer, or engagement data
  is strong enough.
- Monitor cost per useful action and frequency, not impressions alone.

### Google Ads Fundamentals

Evidence:

- Page 10: separates informational and transactional searches.
- Page 14: shows account structure with five to ten keywords, two to five ads,
  and one landing page per ad group.
- Page 15: separates general, specific, and branded queries.
- Page 18: transactional terms are longer and closer to buying.
- Page 35: combine keyword lists, normalize, deduplicate, block bad keywords,
  and sort into informational, transactional, and branded categories.
- Page 38: sort product/service buckets by search stage and write different ads
  for informational, transactional, and branded intent.

Operational decisions for Cesar Store:

- The one-ad-group campaign structure is weak for the product mix.
- Build ad groups by product intent and landing page.
- Separate brand, general category, and high-intent transactional searches.
- Use keyword cleanup and negative keywords as a recurring process.

### What-Is-Google-Ads

Evidence:

- Page 15: Search campaigns are a strong starting point among Google campaign
  types.
- Page 16: identifies Search and Shopping campaigns.
- Page 17: identifies Display campaigns.
- Page 24: explains campaign/ad group/account organization.
- Page 26: Quality Score depends on expected CTR, ad relevance, and landing
  page.
- Pages 29-30: ad rank depends on bid, quality, competitiveness, search
  context, and expected extension impact.
- Pages 32-33: Quality Score is useful but not the same as hidden ad rank.

Operational decisions for Cesar Store:

- Do not solve performance by budget alone.
- Improve keyword/ad/landing-page alignment.
- Use extensions/assets where they match real pages and business facts.
- Keep Search as the controlled first channel before broad Display expansion.

### Uncodemy Duplicate Set

Evidence:

- Six provided Uncodemy files have the same SHA256 hash, so they are identical
  files despite different names.
- Text extraction produced broad course/catalog terms, but did not surface
  strong specific campaign-management rules in the current extraction pass.

Operational decision:

- Do not use the Uncodemy file as a primary source until a visual/manual review
  identifies concrete actionable sections.

## User-Provided Advanced Guide

Status: added as project guidance, not PDF-derived evidence.

Operational decisions preserved:

- Start from conversion funnel and business value, not keywords alone.
- Treat broad match as an advanced test after reliable conversion tracking and
  negative keyword hygiene.
- Keep shared negative keyword lists and update them weekly.
- Use in-market audiences in Observation first.
- Avoid budget or strategy changes above roughly 15-20% weekly without clear
  reason and explicit budget approval.
- Review RSA asset details and replace weak assets.
- Use ad scheduling only after hour/day data proves it.
- Display and YouTube require stricter placement exclusions.

## Confidence Levels

High confidence:

- Google Search campaign should be split into focused ad groups.
- Every ad group needs matching keywords, ad copy, and landing page.
- Search intent must be classified before spending.
- Negative keyword review must be recurring.
- Campaign changes should be paced and measured.

Medium confidence:

- Suggested Cesar Store ad group list is directionally right, but should be
  validated against live product inventory and search-term data.
- Meta campaign structure should follow product use cases, but creative quality
  and tracking readiness must be checked first.

Low confidence / pending:

- Uncodemy source content until visual/manual review finds concrete guidance.
- Any advanced bidding move such as target ROAS or conversion value bidding
  before verified purchase value tracking.
- Broad match before real conversion data and search-term hygiene.

## Next Learning Work Required

1. If the user wants proof-level learning, process each PDF in a slower pass:
   chapter list, page evidence, extracted rule, Cesar Store application, and
   whether it is safe to act on now.
2. Review Google Ads account live before applying campaign changes.
3. Build a campaign audit checklist from current account settings and this
   source audit.
4. Create a separate Meta Ads launch plan only after Pixel/CAPI and creative
   assets are reviewed.
