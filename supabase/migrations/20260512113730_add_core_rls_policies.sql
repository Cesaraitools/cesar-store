alter table if exists public.products enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.promos enable row level security;
alter table if exists public.carts enable row level security;
alter table if exists public.cart_items enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.order_tracking_events enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.media_assets enable row level security;
alter table if exists public.import_jobs enable row level security;
alter table if exists public.admin_audit_logs enable row level security;

revoke all on table
  public.carts,
  public.cart_items,
  public.orders,
  public.order_items,
  public.order_tracking_events,
  public.invoices,
  public.media_assets,
  public.import_jobs,
  public.admin_audit_logs
from anon, authenticated;

grant select on public.products to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.promos to anon, authenticated;

grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.order_tracking_events to authenticated;
grant select on public.invoices to authenticated;

drop policy if exists products_public_read_active on public.products;
create policy products_public_read_active
on public.products
for select
to anon, authenticated
using (coalesce(is_active, false) = true);

drop policy if exists categories_public_read_active on public.categories;
create policy categories_public_read_active
on public.categories
for select
to anon, authenticated
using (coalesce(active, false) = true);

drop policy if exists promos_public_read_active on public.promos;
create policy promos_public_read_active
on public.promos
for select
to anon, authenticated
using (coalesce(is_active, false) = true);

drop policy if exists carts_owner_select on public.carts;
create policy carts_owner_select
on public.carts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists carts_owner_insert on public.carts;
create policy carts_owner_insert
on public.carts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists carts_owner_update on public.carts;
create policy carts_owner_update
on public.carts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists carts_owner_delete on public.carts;
create policy carts_owner_delete
on public.carts
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists cart_items_owner_select on public.cart_items;
create policy cart_items_owner_select
on public.cart_items
for select
to authenticated
using (
  exists (
    select 1
    from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
  )
);

drop policy if exists cart_items_owner_insert on public.cart_items;
create policy cart_items_owner_insert
on public.cart_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
  )
);

drop policy if exists cart_items_owner_update on public.cart_items;
create policy cart_items_owner_update
on public.cart_items
for update
to authenticated
using (
  exists (
    select 1
    from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
  )
);

drop policy if exists cart_items_owner_delete on public.cart_items;
create policy cart_items_owner_delete
on public.cart_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
  )
);

drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select
on public.orders
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists order_items_owner_select on public.order_items;
create policy order_items_owner_select
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists order_tracking_events_owner_select on public.order_tracking_events;
create policy order_tracking_events_owner_select
on public.order_tracking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_tracking_events.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists invoices_owner_select on public.invoices;
create policy invoices_owner_select
on public.invoices
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = invoices.order_id
      and orders.user_id = auth.uid()
  )
);;
