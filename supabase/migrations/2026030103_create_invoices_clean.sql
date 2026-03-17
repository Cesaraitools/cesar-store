-- =====================================================
-- Create invoices table (CLEAN - IMMUTABLE SNAPSHOT)
-- Project: Cesar Store
-- Phase: Invoices DB (Final Architecture)
-- =====================================================

create table if not exists public.invoices (
  id uuid primary key,

  order_id uuid not null unique,

  invoice_number text not null unique,

  issued_at timestamptz not null default now(),

  currency text not null default 'EGP',

  seller_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  items_snapshot jsonb not null,

  subtotal numeric not null,
  shipping_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null,

  notes text null,

  constraint fk_invoices_order
    foreign key (order_id)
    references public.orders(id)
    on delete restrict
);

-- =====================================================
-- Indexes
-- =====================================================

create index if not exists idx_invoices_order_id
  on public.invoices(order_id);

create index if not exists idx_invoices_issued_at
  on public.invoices(issued_at);