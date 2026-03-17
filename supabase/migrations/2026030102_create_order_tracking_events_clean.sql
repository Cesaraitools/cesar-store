-- =====================================================
-- Create order_tracking_events table (CLEAN - EVENTS ONLY)
-- Project: Cesar Store
-- Phase: Order Tracking DB (Final Architecture)
-- =====================================================

create table if not exists public.order_tracking_events (
  id uuid primary key,

  order_id uuid not null,

  status text not null,
  -- requested | confirmed | preparing | shipped | delivered | canceled

  actor text not null,
  -- system | admin

  note text null,

  created_at timestamptz not null default now(),

  constraint fk_order_tracking_order
    foreign key (order_id)
    references public.orders(id)
    on delete cascade
);

-- =====================================================
-- Indexes
-- =====================================================

create index if not exists idx_order_tracking_events_order_id
  on public.order_tracking_events(order_id);

create index if not exists idx_order_tracking_events_created_at
  on public.order_tracking_events(created_at);

create index if not exists idx_order_tracking_events_status
  on public.order_tracking_events(status);