-- =====================================================
-- Create orders table (CLEAN - IMMUTABLE SNAPSHOT)
-- Project: Cesar Store
-- Phase: Orders DB (Final Architecture)
-- =====================================================

create table if not exists public.orders (
  id uuid primary key,

  user_id uuid null,

  order_number text not null unique,

  currency text not null default 'EGP',

  subtotal numeric not null,
  shipping_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null,

  customer_snapshot jsonb not null,
  items_snapshot jsonb not null,

  created_at timestamptz not null default now()
);

-- =====================================================
-- Indexes
-- =====================================================

create index if not exists idx_orders_user_id
  on public.orders(user_id);

create index if not exists idx_orders_created_at
  on public.orders(created_at);