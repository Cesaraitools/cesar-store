# Archived local-only migrations

These files are intentionally outside `supabase/migrations`, so Supabase CLI does not
treat them as pending production migrations.

They were archived on 2026-11-17 during the SEO/AIO release-safety audit:

- `2026050902_create_order_atomic_rpc.sql` was superseded by the production-recorded
  `20260512113528_create_order_atomic_rpc.sql` and
  `20260512113631_harden_order_rpc.sql`. Running the old file now would restore an older
  function body and broader execute grants.
- `2026051501_unify_atomic_cart_order.sql` is not present in production migration
  history. Its final cart invariants have since been replaced by variant-aware indexes,
  while its order function is superseded by later recorded migrations. It must not be
  replayed after those newer migrations.
- `20261107042840_purge_cancelled_social_posts.sql` contains the function recorded in
  production as `20261107043335_add_cancelled_social_post_purge_function.sql` plus a
  historical hard-delete cleanup. Production currently has zero cancelled queue or event
  rows, so replaying the cleanup is unnecessary.

Do not move these files back into the active migration directory. They are retained only
as historical evidence for the reconciliation audit.
