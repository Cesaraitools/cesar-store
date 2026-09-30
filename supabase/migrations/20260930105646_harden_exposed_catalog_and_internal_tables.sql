-- Restrict catalog reads to the data customers actually need and keep every
-- mutation behind the server-side service role.
alter table public.categories enable row level security;

revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to anon, authenticated;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories
for select
to anon, authenticated
using (active is true);

-- These tables are only used by authenticated admin API routes through the
-- service-role client. They must not be exposed through the public Data API.
alter table public.promos enable row level security;
alter table public.media_assets enable row level security;
alter table public.import_jobs enable row level security;

revoke all on table public.promos from anon, authenticated;
revoke all on table public.media_assets from anon, authenticated;
revoke all on table public.import_jobs from anon, authenticated;

-- Defense in depth for existing internal tables. RLS already blocks these
-- roles, while revoking table privileges prevents accidental future exposure
-- if a permissive policy is added later.
revoke all on table public.admin_audit_logs from anon, authenticated;
revoke all on table public.wholesale_applications from anon, authenticated;
revoke all on table public.wholesale_cart_items from anon, authenticated;
revoke all on table public.wholesale_carts from anon, authenticated;
revoke all on table public.wholesale_customers from anon, authenticated;
revoke all on table public.wholesale_order_items from anon, authenticated;
revoke all on table public.wholesale_order_returns from anon, authenticated;
revoke all on table public.wholesale_orders from anon, authenticated;
revoke all on table public.wholesale_product_settings from anon, authenticated;

-- Both functions are trigger-only helpers. Pin their name resolution and
-- prevent direct RPC execution while preserving their existing trigger logic.
alter function public.handle_new_user() set search_path = '';
alter function public.log_order_status_change() set search_path = '';

revoke execute on function public.handle_new_user()
from public, anon, authenticated, service_role;
revoke execute on function public.log_order_status_change()
from public, anon, authenticated, service_role;
