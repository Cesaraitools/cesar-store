# Cesar Store Working Rules

Use these rules before starting any new Cesar Store task, especially in a new
chat:

Current unified roadmap and verified status:
`docs/cesar-store-development-status-2026-08-29.md`.

1. Continue from the latest confirmed state. Do not repeat completed steps.
2. Treat the production site as live and sensitive.
3. Make every change surgically after reading the relevant code and its
   dependencies.
4. Check related logic before editing, especially cart, orders, product
   variants, inventory, PDF invoices, Supabase data flow, SEO routes, and
   automation endpoints.
5. Keep changes scoped to the requested behavior. Do not refactor unrelated
   code.
6. Do not manually edit products in Google Merchant Center. Product changes
   must come from the site source/feed.
7. Do not run `npm run build` for this project. Use:
   `npx tsc --noEmit --incremental false`
8. Do not create temporary, migration, or test files unless necessary. Remove
   temporary files before finishing.
9. Preserve live business flows: cart, checkout, order creation, product
   variants, stock linking, stock restore, admin order handling, and invoices.
10. After code changes, run focused checks and report exactly what changed.

New-chat prompt reminder:

```text
Continue Cesar Store from the last confirmed state. Work surgically. Read the
related code and external dependencies before editing. Do not repeat completed
steps. Do not run npm run build; use npx tsc --noEmit --incremental false.
Avoid broad refactors and protect cart, checkout, orders, product variants,
stock, Supabase flows, SEO routes, automation endpoints, and PDF invoices.
```
