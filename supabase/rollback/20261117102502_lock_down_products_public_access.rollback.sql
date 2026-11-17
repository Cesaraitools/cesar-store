-- GUARDED EXACT RESTORATION ONLY.
--
-- This recreates the insecure state captured before migration
-- 20261117102502. Do not run it as a routine application rollback. It requires
-- a new explicit owner approval and evidence that a safe operational recovery
-- cannot keep the least-privilege database posture in place.

begin;

drop policy if exists products_public_read_active on public.products;
drop policy if exists "Allow insert" on public.products;
drop policy if exists "Allow insert products" on public.products;
drop policy if exists "Allow read products" on public.products;
drop policy if exists "Public can view active products" on public.products;

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
