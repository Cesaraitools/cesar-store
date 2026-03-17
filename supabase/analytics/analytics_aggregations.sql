-- =====================================================
-- Analytics Aggregations (READ-ONLY)
-- Project: Cesar Store
-- Scope: Backend Queries / Aggregations for Admin Analytics
-- Status: EXECUTION-READY (NO MUTATIONS)
-- =====================================================
-- SOURCES:
--  - public.orders (IMMUTABLE SNAPSHOT)
--  - public.order_tracking_events (EVENTS ONLY)
--  - public.order_versions (DESIGN-ONLY SEMANTICS)
--
-- IMPORTANT:
-- 1) Financial metrics MUST read from confirmed order_versions ONLY.
-- 2) If no confirmed version exists for an order, it is excluded from
--    financial metrics (legacy-safe behavior).
-- 3) Tracking status is derived from LAST event per order.
-- =====================================================

-- =====================================================
-- Helper View: last_tracking_status_per_order
-- =====================================================
create or replace view public.analytics_last_tracking_status as
select
  e.order_id,
  e.status as current_status,
  e.created_at as status_at
from public.order_tracking_events e
join (
  select order_id, max(created_at) as max_created_at
  from public.order_tracking_events
  group by order_id
) last_e
  on last_e.order_id = e.order_id
 and last_e.max_created_at = e.created_at;

-- =====================================================
-- Helper View: confirmed_order_versions
-- =====================================================
-- DESIGN-ONLY SEMANTICS:
-- Reads from order_versions assuming it exists logically.
-- Financial analytics MUST rely on this view.
-- =====================================================
create or replace view public.analytics_confirmed_order_versions as
select
  ov.order_id,
  ov.version_number,
  ov.currency,
  ov.subtotal,
  ov.shipping_fee,
  ov.discount,
  ov.total,
  ov.created_at
from public.order_versions ov
where ov.status = 'confirmed';

-- =====================================================
-- Volume Metrics
-- =====================================================
create or replace view public.analytics_volume as
select
  count(o.id) as total_orders,
  min(o.created_at) as first_order_at,
  max(o.created_at) as last_order_at
from public.orders o;

-- Orders per day
create or replace view public.analytics_orders_per_day as
select
  date_trunc('day', o.created_at)::date as day,
  count(o.id) as orders_count
from public.orders o
group by 1
order by 1;

-- =====================================================
-- Financial Metrics (CONFIRMED VERSIONS ONLY)
-- =====================================================
create or replace view public.analytics_financial_totals as
select
  cov.currency,
  count(distinct cov.order_id) as confirmed_orders_count,
  sum(cov.subtotal) as subtotal_sum,
  sum(cov.shipping_fee) as shipping_sum,
  sum(cov.discount) as discount_sum,
  sum(cov.total) as revenue_sum,
  avg(cov.total) as avg_order_value
from public.analytics_confirmed_order_versions cov
group by cov.currency;

-- Revenue per day
create or replace view public.analytics_revenue_per_day as
select
  date_trunc('day', cov.created_at)::date as day,
  cov.currency,
  sum(cov.total) as revenue
from public.analytics_confirmed_order_versions cov
group by 1, 2
order by 1;

-- =====================================================
-- Lifecycle Metrics (Tracking Durations)
-- =====================================================
-- Calculates durations between key lifecycle states.
-- Missing transitions are ignored safely.
-- =====================================================
create or replace view public.analytics_lifecycle_durations as
with events as (
  select
    order_id,
    status,
    created_at
  from public.order_tracking_events
),
pivoted as (
  select
    order_id,
    min(created_at) filter (where status = 'requested') as requested_at,
    min(created_at) filter (where status = 'confirmed') as confirmed_at,
    min(created_at) filter (where status = 'preparing') as preparing_at,
    min(created_at) filter (where status = 'shipped') as shipped_at,
    min(created_at) filter (where status = 'delivered') as delivered_at,
    min(created_at) filter (where status = 'canceled') as canceled_at
  from events
  group by order_id
)
select
  order_id,
  confirmed_at - requested_at as time_to_confirm,
  shipped_at - confirmed_at as time_to_ship,
  delivered_at - shipped_at as time_to_deliver
from pivoted;

-- =====================================================
-- Reliability Metrics
-- =====================================================
-- Cancel rate based on final status
-- =====================================================
create or replace view public.analytics_reliability as
select
  count(*) filter (where lts.current_status = 'canceled')::numeric
    / nullif(count(*), 0) as cancel_rate,
  count(*) as total_orders
from public.analytics_last_tracking_status lts;

-- Versions per order (DESIGN-ONLY SEMANTICS)
create or replace view public.analytics_versions_per_order as
select
  ov.order_id,
  count(*) as versions_count
from public.order_versions ov
group by ov.order_id;

-- =====================================================
-- Orders With Multiple Versions
-- =====================================================
create or replace view public.analytics_orders_multiple_versions as
select
  vpo.order_id,
  vpo.versions_count
from public.analytics_versions_per_order vpo
where vpo.versions_count > 1;

-- =====================================================
-- Searchable Orders Index (Read-Only)
-- =====================================================
create or replace view public.analytics_orders_index as
select
  o.id as order_id,
  o.order_number,
  o.user_id,
  o.created_at,
  lts.current_status,
  lts.status_at
from public.orders o
left join public.analytics_last_tracking_status lts
  on lts.order_id = o.id;

-- =====================================================
-- END OF ANALYTICS AGGREGATIONS
-- =====================================================