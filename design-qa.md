# Orbit landing hero design QA

- Source visual truth: `C:\Users\Ahmed Ali\Downloads\ORBIT-5-01-LITE.mp4`
- Source capture: `D:\mohamed adel work\cesar-store\.codex-artifacts\orbit-reference.png`
- Rendered implementation: `http://localhost:3010/`
- Implementation capture: `D:\mohamed adel work\cesar-store\.codex-artifacts\orbit-desktop-products-19.png`
- Mobile capture: `D:\mohamed adel work\cesar-store\.codex-artifacts\orbit-mobile-products-7.png`
- Combined comparison: `D:\mohamed adel work\cesar-store\.codex-artifacts\orbit-comparison-final.png`
- Viewport: 1265 x 712 browser viewport; desktop implementation normalized into a 960 x 720 comparison frame.
- Source pixels: 960 x 720 at 1x density.
- Implementation pixels: 1265 x 712 at 1x density.
- State: Arabic landing page, catalog data loaded, automatic orbit running, 19 desktop background products and 7 mobile background products.

## Full-view comparison evidence

The combined comparison confirms that the implementation preserves the reference's central fan/orbit composition, overlapping portrait cards, curved foreground base, depth ordering, and continuous lateral movement. The implementation intentionally replaces the reference's monochrome art with full-color Cesar category imagery and replaces the flat gray background with deterministic, scattered Cesar product cards, as requested.

## Focused-region comparison evidence

The orbit and curved base were inspected separately at the top and bottom of the hero. Category titles, CTA, previous/next controls, image crops, rounded corners, shadows, focus states, and active-category updates were readable at the tested desktop viewport. A separate focused crop was not required because these details remain legible in the full-resolution implementation capture.

## Required fidelity surfaces

- Fonts and typography: Arabic hierarchy is clear, uses the site's existing font stack and strong display weights, and remains readable over the softened product-card background.
- Spacing and layout rhythm: The first pass placed most of the orbit below the fold. The hero height, heading scale, stage height, card size, and foreground curve were tightened so the orbit and CTA are visible together at 1265 x 712.
- Colors and tokens: Full-color imagery, warm off-white canvas, slate text, blue brand accent, and white foreground base meet the requested Cesar treatment while maintaining contrast.
- Image quality and asset fidelity: Real category and product images from the Cesar catalog are used. No video rasterization, generated placeholder art, custom SVG illustration, or CSS-drawn replacement is used.
- Copy and content: Arabic and English instructions explain mouse movement and dragging. Category title, subtitle, and CTA update from the live catalog response.

## Interaction and accessibility evidence

- Dragging the orbit changed the active category.
- Previous/next buttons changed the active category and CTA target.
- Automatic category movement resumed after interaction.
- A real pointer click on each previous/next control changed the active category and CTA target on desktop and mobile.
- A real click on the active CTA navigated to the selected `/shop?category=...` route.
- Arabic/English switching updated headings, labels, and category content.
- Category cards are keyboard-focusable links with visible focus rings.
- Reduced-motion preference disables automatic motion while preserving manual controls.
- Browser console check found no implementation errors. The only warning was an existing Meta Pixel conflicting-version warning from `connect.facebook.net`.

## Comparison history

### Iteration 1

- Finding [P2]: The desktop hero was too tall, leaving the orbit mostly below the initial viewport.
- Fix: Replaced large content padding and fixed minimum heights with viewport-aware height bounds; reduced stage and card sizes while preserving the fan composition.
- Post-fix evidence: `orbit-desktop-v3.png` shows the orbit above the curve and the active category controls within the initial viewport.

### Iteration 2

- Finding [P2]: The foreground curve obscured too much of the category artwork.
- Fix: Lowered the curved base while preserving space for the title, CTA, and navigation controls.
- Post-fix evidence: `orbit-desktop-final.png` and `orbit-comparison-final.png` show substantially more category imagery while retaining the reference's curved foreground silhouette.

### Iteration 3

- Finding [P1]: Section-level pointer capture intercepted normal clicks on arrows and category links until pointer interaction occurred.
- Fix: Pointer capture is now deferred until dragging exceeds 8px, semantic controls are excluded from section drag capture, and button/link pointer-down events stop propagation.
- Finding [P2]: The requested background density and lifted-card effect were not yet represented across every catalog category.
- Fix: The server response now selects three active in-stock products per normal category and one product from offers (19 total). Deterministic overlapping positions, stronger layered shadows, borders, and varied rotations create the lifted scattered-card effect without layout instability.
- Performance guardrail: Catalog loading starts after `window.load` plus 700ms; background images use lazy loading with low fetch priority; CSS hides cards 8-19 on mobile and 13-19 on tablet.
- Post-fix evidence: `orbit-desktop-products-19.png` shows the complete scattered background; `orbit-mobile-products-7.png` confirms the responsive density limit and accessible controls.

## Residual test gap

- No remaining responsive-layout blocker was found in the tested 390 x 844 mobile viewport. Physical touch-device testing remains an owner acceptance step, not a code blocker.

## Findings

- No remaining actionable desktop P0/P1/P2 findings.
- No remaining actionable desktop or mobile P0/P1/P2 finding in the implemented hero.

## Implementation checklist

- [x] Match the reference orbit/fan motion in React and CSS.
- [x] Use full-color Cesar category cards.
- [x] Add deterministic scattered Cesar product cards behind the orbit.
- [x] Support pointer direction, dragging, automatic movement, buttons, keyboard focus, reduced motion, Arabic, and English.
- [x] Verify catalog API payload and desktop browser rendering.
- [x] Complete a 390 x 844 mobile-width visual pass and verify the reduced background-card count and real button clicks.

## Follow-up polish

- Consider adjusting individual live catalog image focal points if the owner prefers different crops after reviewing real mobile screenshots.

final result: pass
