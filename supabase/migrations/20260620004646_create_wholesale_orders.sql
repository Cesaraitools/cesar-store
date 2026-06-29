create extension if not exists pgcrypto;

create sequence if not exists public.wholesale_orders_order_number_seq;

create table if not exists public.wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'W' || lpad(nextval('public.wholesale_orders_order_number_seq'::regclass)::text, 6, '0')
  ),
  order_token text not null unique,
  wholesale_customer_id uuid not null references public.wholesale_customers(id) on delete restrict,
  auth_user_id uuid not null,
  customer_snapshot jsonb not null default '{}'::jsonb,
  items_snapshot jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (
    status in ('new', 'reviewing', 'contacted', 'completed', 'cancelled')
  ),
  subtotal numeric not null default 0 check (subtotal >= 0),
  currency text not null default 'EGP',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wholesale_orders_customer_id
  on public.wholesale_orders(wholesale_customer_id);

create index if not exists idx_wholesale_orders_auth_user_id
  on public.wholesale_orders(auth_user_id);

create index if not exists idx_wholesale_orders_status
  on public.wholesale_orders(status);

create index if not exists idx_wholesale_orders_created_at
  on public.wholesale_orders(created_at desc);

create table if not exists public.wholesale_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wholesale_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_ar text not null default '',
  product_name_en text not null default '',
  image text,
  unit_type text not null,
  unit_label text not null default '',
  quantity_per_unit numeric not null default 1 check (quantity_per_unit > 0),
  min_order_units integer not null default 1 check (min_order_units > 0),
  ordered_units integer not null check (ordered_units > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  line_total numeric not null default 0 check (line_total >= 0),
  stock_snapshot integer not null default 0,
  settings_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wholesale_order_items_order_id
  on public.wholesale_order_items(order_id);

create index if not exists idx_wholesale_order_items_product_id
  on public.wholesale_order_items(product_id);

alter table public.wholesale_orders enable row level security;
alter table public.wholesale_order_items enable row level security;
