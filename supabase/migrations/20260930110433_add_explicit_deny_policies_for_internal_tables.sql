-- These tables are intentionally service-role only. Explicit deny policies
-- preserve the closed posture even if table grants are changed later.
drop policy if exists "Direct client access is disabled" on public.admin_audit_logs;
create policy "Direct client access is disabled"
on public.admin_audit_logs for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.promos;
create policy "Direct client access is disabled"
on public.promos for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.media_assets;
create policy "Direct client access is disabled"
on public.media_assets for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.import_jobs;
create policy "Direct client access is disabled"
on public.import_jobs for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_applications;
create policy "Direct client access is disabled"
on public.wholesale_applications for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_cart_items;
create policy "Direct client access is disabled"
on public.wholesale_cart_items for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_carts;
create policy "Direct client access is disabled"
on public.wholesale_carts for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_customers;
create policy "Direct client access is disabled"
on public.wholesale_customers for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_order_items;
create policy "Direct client access is disabled"
on public.wholesale_order_items for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_order_returns;
create policy "Direct client access is disabled"
on public.wholesale_order_returns for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_orders;
create policy "Direct client access is disabled"
on public.wholesale_orders for all to anon, authenticated
using (false) with check (false);

drop policy if exists "Direct client access is disabled" on public.wholesale_product_settings;
create policy "Direct client access is disabled"
on public.wholesale_product_settings for all to anon, authenticated
using (false) with check (false);
