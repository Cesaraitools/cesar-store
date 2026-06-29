create table if not exists public.wholesale_carts (
  id uuid primary key default gen_random_uuid(),
  wholesale_customer_id uuid not null references public.wholesale_customers(id) on delete cascade,
  auth_user_id uuid not null,
  status text not null default 'active' check (status in ('active', 'submitted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_wholesale_carts_one_active_per_customer
  on public.wholesale_carts(wholesale_customer_id)
  where status = 'active';

create index if not exists idx_wholesale_carts_auth_user_id
  on public.wholesale_carts(auth_user_id);

create table if not exists public.wholesale_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.wholesale_carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  ordered_units integer not null check (ordered_units > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_wholesale_cart_items_unique_product
  on public.wholesale_cart_items(cart_id, product_id);

create index if not exists idx_wholesale_cart_items_product_id
  on public.wholesale_cart_items(product_id);

alter table public.wholesale_carts enable row level security;
alter table public.wholesale_cart_items enable row level security;
