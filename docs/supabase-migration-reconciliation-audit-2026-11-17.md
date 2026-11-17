# Supabase migration reconciliation audit

Audit date: 2026-11-17

Project: `bdmumdbykzbozgkxtsmk`

## Safety boundary

This audit used read-only migration listing and SQL inspection. It did not run
`supabase db push`, `supabase migration repair`, DDL, DML, or the new commerce-identifier
migration against production.

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

This is strong evidence that the wholesale SQL is already deployed outside the recorded
migration history. The safe production action is a separately approved, version-by-version
history repair to mark these nine versions as applied, followed immediately by another
read-only migration list. Do not run their SQL.

### Genuinely pending migration

`20261116190958_product_commerce_identifiers.sql` is the only intentional new schema
change. Production does not yet have `brand`, `manufacturer`, `mpn`, `gtin`, or `model`
on `public.products`.

The application remains backward compatible before this migration: ordinary product
create/edit operations retry the legacy column set, while non-empty identifier writes fail
clearly rather than silently discarding data.

## Required sequence before production rollout

1. Review this audit and the archived files.
2. In a dedicated database change window, repair only the nine wholesale history versions
   listed above to `applied`; do not repair the commerce-identifier version.
3. Confirm `supabase migration list --linked` shows no legacy local-only or remote-only
   rows and shows only `20261116190958` as pending locally.
4. Take a fresh database backup or verified recovery point.
5. Apply only `20261116190958_product_commerce_identifiers.sql`.
6. Verify the five nullable columns, GTIN constraint, ordinary product editing, and a
   read-only purchase-flow smoke test before promoting the application build.

No production database step in this sequence is authorized by this audit alone.
