-- =====================================================
-- DESIGN-ONLY: order_versions (REFERENCE ONLY)
-- Project: Cesar Store
-- Purpose: Analytics + Architecture Lock
-- Status: DESIGN-ONLY (NOT EXECUTED)
-- =====================================================
-- ⚠️ WARNING:
-- This file is a DESIGN REFERENCE.
-- It MUST NOT be applied to the database.
-- It exists to lock Analytics semantics and queries
-- without breaking the current production schema.
-- =====================================================

-- -----------------------------------------------------
-- Concept
-- -----------------------------------------------------
-- Each Order has 0..N Versions
-- Each Version is a full immutable snapshot
-- Only ONE version can be confirmed per logical state
-- Revenue & financial analytics MUST read from:
--   status = 'confirmed'
-- -----------------------------------------------------

create table if not exists public.order_versions (
  id uuid primary key,

  order_id uuid not null,
  -- FK → orders.id (logical, not enforced here)

  version_number integer not null,
  -- starts from 1, strictly increasing per order

  status text not null,
  -- draft | confirmed

  currency text not null default 'EGP',

  subtotal numeric not null,
  shipping_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null,

  customer_snapshot jsonb not null,
  items_snapshot jsonb not null,

  created_at timestamptz not null default now(),

  created_by text not null
  -- customer | admin
);

-- -----------------------------------------------------
-- Logical Constraints (DESIGN INTENT)
-- -----------------------------------------------------
-- 1) (order_id, version_number) is UNIQUE
-- 2) version_number is strictly increasing per order
-- 3) status = 'confirmed' is IMMUTABLE
-- 4) NO DELETE
-- 5) NO UPDATE after confirmed
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Analytics Semantics (CRITICAL)
-- -----------------------------------------------------
-- Financial Metrics:
--   SELECT ... FROM order_versions
--   WHERE status = 'confirmed'
--
-- Reliability Metrics:
--   COUNT(*) versions per order
--
-- Revenue:
--   SUM(total) FROM confirmed versions ONLY
--
-- Orders WITHOUT versions:
--   Treated as pre-versioning legacy orders
--   (Handled explicitly in Analytics queries)
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Indexes (DESIGN INTENT)
-- -----------------------------------------------------
-- idx_order_versions_order_id
-- idx_order_versions_created_at
-- idx_order_versions_status
--
-- NOTE: Indexes are documented for future execution
-- -----------------------------------------------------

-- =====================================================
-- END OF DESIGN-ONLY REFERENCE
-- =====================================================