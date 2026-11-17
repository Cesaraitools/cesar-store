# Supabase migration reconciliation audit

Audit date: 2026-11-17

Project: `bdmumdbykzbozgkxtsmk`

## Safety boundary

The initial audit used read-only migration listing and SQL inspection. Subsequent actions
were performed only after separate, explicit owner approvals: first the migration-history
repair, then the single commerce-identifier migration. No wholesale migration SQL was
replayed, no product identifier values were populated, and no retail or wholesale order
was created during verification.

## Findings

### Production-recorded migrations restored locally

The production migration statements were fetched into a temporary directory and compared
with the repository. The active local migration tree now uses the production timestamps
for the May and November records:

- `20260512113045_extend_promos_for_shop_side_sliders`
- `20260512113113_extend_promos_for_product_selection`
- `20260512113204_phase_a_schema_stabilization`
- `20260512113528_create_order_atomic_rpc`
- `20260512113631_harden_order_rpc`
- `20260512113730_add_core_rls_policies`
- `20260512113745_normalize_admin_audit_logs`
- `20260512113810_backfill_order_items_from_snapshots`
- `20260512113830_expire_stale_import_jobs`
- `20261107043335_add_cancelled_social_post_purge_function`

The first three were statement-equivalent to local files with earlier timestamps. The
remaining production-only statements were restored from the migration history table.
The previously amended local copies of `20260528073730_product_variants_json` and
`20261030114338_social_publisher` were also restored from the recorded production
statements, so an already-applied migration no longer carries unrecorded semantic drift.

### Dangerous legacy files removed from the active migration path

Three local-only files were moved to
`supabase/migration-archive/legacy-local-only/` rather than deleted:

- `2026050902_create_order_atomic_rpc.sql`
- `2026051501_unify_atomic_cart_order.sql`
- `20261107042840_purge_cancelled_social_posts.sql`

The two order migrations are obsolete relative to later production-recorded order RPC
migrations. Replaying them now could replace the current order function with an older
implementation or broader grants. The social-publisher file contains an already-recorded
function plus historical destructive cleanup; current production counts are zero cancelled
queue rows and zero related publication-event rows.

### Wholesale migrations exist in schema but not in history

The following versions remain local-only and must not be executed again:

- `2026061901`
- `20260620004646`
- `20260621141948`
- `20260621155254`
- `20260621183042`
- `20260621191204`
- `20260622091500`
- `20260622094500`
- `202607180001`

Read-only production checks proved:

- All eight expected wholesale tables exist with the final variant, token, stock,
  archive, and return columns.
- RLS is enabled on every wholesale table and each has its internal-only policy.
- The final seven functions exist. After whitespace normalization, every production
  function body has the same length and MD5 as the latest local definition:
  `wholesale_adjust_product_stock`, `create_wholesale_order_from_cart_atomic`,
  `update_wholesale_order_status_atomic`, `create_wholesale_order_return_atomic`,
  `archive_wholesale_order_atomic`, `add_wholesale_order_item_atomic`, and
  `delete_cancelled_social_post`.
- The expected variant-cart, customer-token, active-cart, and archive indexes exist.

This is strong evidence that the wholesale SQL was already deployed outside the recorded
migration history.

### History repair completed

With explicit owner approval on 2026-11-17, Supabase migration history was repaired to
mark the nine wholesale versions above as `applied`. The repair command changed migration
history only; it did not execute those migration statements.

Immediate post-repair checks confirmed:

- Local and remote history now match for all previously deployed versions.
- `20261116190958_product_commerce_identifiers` is the only local-only migration.
- Wholesale orders and wholesale customers remain at zero rows.
- Wholesale product settings remain at 12 rows; these are product configuration records,
  not sales, reports, customers, carts, or orders.
- The five commerce-identifier columns remain absent, proving the pending migration was
  not executed as part of history repair.
- A post-repair `supabase db push --dry-run` listed exactly one migration:
  `20261116190958_product_commerce_identifiers.sql`.
- Supabase reported a completed physical backup from 2026-11-16 03:30:52 UTC, with seven
  completed daily physical backups visible in the current retention window.

### Commerce-identifier migration completed

With separate explicit owner approval on 2026-11-17,
`20261116190958_product_commerce_identifiers.sql` was applied as the only pending
migration. Post-apply verification confirmed:

- Local and remote migration history match, and a new `supabase db push --dry-run`
  reports that the remote database is up to date.
- `brand`, `manufacturer`, `mpn`, `gtin`, and `model` exist on `public.products` as
  nullable text columns with the expected comments.
- `products_gtin_format_check` exists and is validated for 8, 12, 13, or 14 digits.
- All five new columns contain zero populated values. The migration added schema only;
  it did not manufacture, infer, or overwrite product identifiers.
- The product table still contains 314 rows, including 262 active rows, with aggregate
  stock of 42,804 after the migration.
- The expanded read-only SEO/AIO verifier passed for 21 public routes, 8 protected routes,
  282 sitemap URLs, 261 catalog products, 362 Merchant feed rows, product structured data,
  and 24 optimized shop images.
- A post-migration browser smoke test added one regular product and one selected variant
  (`العطر: جوزهند`) to the local cart. Prices, stock, variant label, and the
  EGP 1,545 total were correct. Checkout redirected to
  `/auth/login?redirect=/checkout`; no login or order creation was attempted. The browser
  reported zero console errors.

The application retains its legacy-column retry as a compatibility safeguard, although
the production database now supports the identifier fields directly.

## Required sequence before production rollout

1. Completed: review the audit and archive the superseded local-only files.
2. Completed: repair only the nine wholesale history versions to `applied`.
3. Completed: confirm only `20261116190958` remained pending locally.
4. Completed: verify the latest physical recovery point before the schema change.
5. Completed: apply only `20261116190958_product_commerce_identifiers.sql`.
6. Completed: verify the five nullable columns, validated GTIN constraint, read-only
   catalog surfaces, and the purchase flow through the unauthenticated login boundary.

Database readiness is complete. Application promotion remains a separate action and is
not authorized by the database approvals recorded here.
