create extension if not exists pgcrypto;

create sequence if not exists public.orders_order_number_seq;

alter table if exists public.orders
  alter column id set default gen_random_uuid();

alter table if exists public.orders
  alter column order_number set default nextval('public.orders_order_number_seq'::regclass)::text;

alter table if exists public.orders
  add column if not exists status text not null default 'requested',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists confirmed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists snapshot jsonb,
  add column if not exists order_token text,
  add column if not exists archived_at timestamptz;

create index if not exists idx_orders_updated_at
  on public.orders(updated_at);

create index if not exists idx_orders_archived_at
  on public.orders(archived_at);

create index if not exists idx_orders_order_token
  on public.orders(order_token);

alter table if exists public.order_tracking_events
  alter column id set default gen_random_uuid();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  name text not null,
  price numeric not null,
  quantity integer not null check (quantity > 0),
  image text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id
  on public.order_items(order_id);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_entity
  on public.admin_audit_logs(entity, entity_id);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs(created_at);

alter table if exists public.products
  add column if not exists low_stock_threshold integer not null default 10;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'low_stock_threshold'
  ) then
    alter table public.products
      drop constraint if exists products_low_stock_threshold_check;

    alter table public.products
      add constraint products_low_stock_threshold_check
      check (low_stock_threshold >= 0);
  end if;
end $$;
