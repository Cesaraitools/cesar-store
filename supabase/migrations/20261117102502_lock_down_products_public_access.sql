-- Keep the public catalog read-only. Product creation, editing, deletion, and
-- inventory mutations use trusted server routes with the service-role client.
alter table public.products enable row level security;

-- Remove the legacy permissive policies discovered in production, plus the
-- canonical policy name in case this migration is replayed against a database
-- that already contains an older safe-policy attempt.
drop policy if exists "Allow insert" on public.products;
drop policy if exists "Allow insert products" on public.products;
drop policy if exists "Allow read products" on public.products;
drop policy if exists "Public can view active products" on public.products;
drop policy if exists products_public_read_active on public.products;

-- Table grants and RLS are separate controls. Remove every direct grant from
-- public client roles, then grant only the read access the storefront needs.
revoke all privileges on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;

create policy products_public_read_active
on public.products
for select
to anon, authenticated
using (
  is_active is true
  and deleted_at is null
);

comment on policy products_public_read_active on public.products is
  'Public clients may read only active, non-deleted catalog products.';
