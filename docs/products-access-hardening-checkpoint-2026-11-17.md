# Products access hardening checkpoint

Checkpoint date: 2026-11-17 (Africa/Cairo)

Project: Cesar Store

Supabase project: `bdmumdbykzbozgkxtsmk`

## Safety boundary

This checkpoint was recorded before changing `app/api/products/route.ts` or
creating the products access-hardening migration. It contains no secrets.
No database DDL, production deployment, branch switch, stash, reset, cleanup,
or mutation of product data was performed while preparing this checkpoint.

## Application rollback point

- Branch: `codex/seo-aio-safe-foundation`
- Application `HEAD`: `5e07529f371f180768dee7b0d12eafbdcc61f44d`
- `origin/main`: `5e07529f371f180768dee7b0d12eafbdcc61f44d`
- Local `main`: `2e3f5e68f12bf600dd30b61e4db1aa1d270782ea`
- `app/api/products/route.ts` was clean before this work.
- Pre-change Git object hash for that file:
  `e0a8968cf4d309b4633736fb369b0059181694a3`
- The owner worktree changes and untracked files listed by `git status` were
  preserved and are outside this change.

The application-side guard can be rolled back without touching any owner work
by restoring only `app/api/products/route.ts` from the `HEAD` above or by
reversing the focused patch after reviewing it.

## Database checkpoint

The last production-recorded migration before this change is:

- `20261116190958_product_commerce_identifiers`

Read-only inspection confirmed:

- RLS is enabled on `public.products` and is not forced for the table owner.
- Row counts: 314 total, 262 active and not deleted, 51 inactive and not
  deleted, and 1 soft-deleted row.
- `anon` can currently see all 314 rows.
- `anon` and `authenticated` each have `SELECT`, `INSERT`, `UPDATE`, `DELETE`,
  `TRUNCATE`, `REFERENCES`, and `TRIGGER` table privileges.
- `service_role` has `SELECT`, `INSERT`, `UPDATE`, and `DELETE`; the planned
  migration does not revoke or alter its privileges.

Policies present before hardening:

| Policy | Command | Roles | Predicate |
| --- | --- | --- | --- |
| `Allow insert` | `INSERT` | `public` | `WITH CHECK (true)` |
| `Allow insert products` | `INSERT` | `public` | `WITH CHECK (true)` |
| `Allow read products` | `SELECT` | `public` | `USING (true)` |
| `Public can view active products` | `SELECT` | `public` | `USING (is_active = true)` |

## Application exposure found during the checkpoint

The live `GET /api/products` response was HTTP 200 with 313 non-deleted rows,
including 51 inactive rows. The route uses the service role and was not guarded
before this work. Repository search found only admin pages consuming this
collection endpoint. The storefront uses the anonymous read-only catalog path.

## Guarded exact database restoration SQL

The SQL below recreates the insecure pre-change state exactly. It is retained
only as a last-resort forensic restoration point. It must not be run
automatically or merely to roll back the application. Running it requires a new
owner approval and evidence that a safe operational alternative is insufficient.

```sql
begin;

drop policy if exists products_public_read_active on public.products;

grant all privileges on table public.products to anon, authenticated;

create policy "Allow insert"
on public.products
for insert
to public
with check (true);

create policy "Allow insert products"
on public.products
for insert
to public
with check (true);

create policy "Allow read products"
on public.products
for select
to public
using (true);

create policy "Public can view active products"
on public.products
for select
to public
using (is_active = true);

commit;
```

## Preferred recovery order

1. If the admin collection endpoint regresses, revert only its focused
   application patch and redeploy the previously verified application commit.
2. Keep the database least-privilege migration in place whenever possible;
   public storefront reads need only `SELECT` under the active, non-deleted RLS
   policy, while product mutations use the server-side service role.
3. Use the guarded exact database restoration SQL only after a new explicit
   approval and a documented operational necessity.
