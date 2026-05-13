# Phase A Stabilization Audit

Project: `cesar-store`  
Date: `2026-05-09`  
Scope: `Schema Drift + Admin/Auth Security + Order Integrity Preconditions`

## Executive Summary

This audit confirms that the current project state is blocked by two `P0` classes of risk:

1. The repository does not contain a full executable source of truth for the production schema.
2. Admin session invalidation and auth protection are not internally consistent across middleware, layout validation, and Redis-backed session state.

No runtime logic was changed in this phase. This file is a stabilization reference for the next surgical fixes.

## Current Repo Reality

- The repo contains only a partial set of Supabase migrations under [supabase/migrations](D:/mohamed%20adel%20work/cesar-store/supabase/migrations).
- Core app logic depends on database fields, tables, and RPCs that are not represented in those migrations.
- `Database Schema.txt` acts as a context snapshot, but it is explicitly marked as non-executable reference only.
- Some analytics SQL depends on `design-only` entities that are not implemented in the migration set.

## P0 Findings

### 1. Orders migration does not match runtime order model

Evidence:

- Runtime order reads expect `status`: [app/api/orders/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/orders/route.ts:86)
- Runtime order creation requires `order_token` and RPC `create_order_atomic`: [app/api/orders/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/orders/route.ts:135), [app/api/orders/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/orders/route.ts:255)
- Current orders migration defines only a minimal snapshot table: [supabase/migrations/2026030101_create_orders_clean.sql](D:/mohamed%20adel%20work/cesar-store/supabase/migrations/2026030101_create_orders_clean.sql:7)
- Reference schema includes fields absent from that migration, such as `status`, `confirmed_at`, `closed_at`, `snapshot`, and `order_token`: [Database Schema.txt](D:/mohamed%20adel%20work/cesar-store/Database%20Schema.txt:80)

Impact:

- Fresh environments built from repo migrations are structurally incompatible with live runtime code.
- Order creation, order listing, tracking, and admin flows cannot be trusted as reproducible from source control alone.

### 2. `create_order_atomic` is required by code but absent from repo migrations

Evidence:

- RPC call is hard-required in order creation: [app/api/orders/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/orders/route.ts:255)
- No matching `create function` or `create or replace function` for `create_order_atomic` exists in `supabase/migrations`.

Impact:

- Order creation has an external hidden dependency.
- Any new environment or disaster recovery flow is incomplete without this function.

### 3. Order archive flow depends on `archived_at`, but migrations do not define it

Evidence:

- Admin orders archive query filters on `archived_at`: `app/api/admin/orders/route.ts` via repo search.
- Archive endpoint updates `archived_at`: [app/api/admin/orders/delete/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/admin/orders/delete/route.ts:67)
- Orders migration does not include `archived_at`: [supabase/migrations/2026030101_create_orders_clean.sql](D:/mohamed%20adel%20work/cesar-store/supabase/migrations/2026030101_create_orders_clean.sql:7)
- Reference schema also does not show `archived_at`: [Database Schema.txt](D:/mohamed%20adel%20work/cesar-store/Database%20Schema.txt:80)

Impact:

- Soft-delete and archive views are schema-fragile.
- Admin archive behavior may work only against a manually evolved database.

### 4. Admin audit logging depends on `admin_audit_logs`, but repo does not define it

Evidence:

- Archive endpoint inserts into `admin_audit_logs`: [app/api/admin/orders/delete/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/admin/orders/delete/route.ts:81)
- No migration defines `admin_audit_logs`.

Impact:

- Admin archive flow has an undeclared runtime dependency.
- Operational auditability is not reproducible from source.

### 5. Product flows depend on `low_stock_threshold`, but schema source of truth does not define it

Evidence:

- Product API reads and writes `low_stock_threshold`: [app/api/products/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/products/route.ts:38), [app/api/products/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/products/route.ts:139), [app/api/products/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/products/route.ts:243)
- Admin products UI relies on it via repo search.
- Reference schema for `products` does not contain `low_stock_threshold`: [Database Schema.txt](D:/mohamed%20adel%20work/cesar-store/Database%20Schema.txt:99)
- No repo migration adds this column.

Impact:

- Inventory status semantics differ between code and documented schema.
- Product admin and low-stock indicators are not source-controlled end to end.

### 6. Admin force logout is effectively disconnected from validation

Evidence:

- Force logout writes `admin_session_version`: [app/api/admin/force-logout/route.ts](D:/mohamed%20adel%20work/cesar-store/app/api/admin/force-logout/route.ts:8)
- Session validator checks only cookie signature + token existence in Redis: [lib/admin/validateAdminSession.ts](D:/mohamed%20adel%20work/cesar-store/lib/admin/validateAdminSession.ts:24)
- `validateAdminSession` never reads `admin_session_version`.
- Middleware also validates only cookie presence and HMAC signature, not Redis session existence: [middleware.ts](D:/mohamed%20adel%20work/cesar-store/middleware.ts:53)

Impact:

- Global admin invalidation is incomplete.
- Revoked sessions may still pass some protection layers depending on path and render path.

### 7. Admin layout uses async validation incorrectly and duplicates auth logic

Evidence:

- Layout calls `validateAdminSession()` without `await`: [app/admin/layout.tsx](D:/mohamed%20adel%20work/cesar-store/app/admin/layout.tsx:54)
- Same layout reimplements signature validation manually: [app/admin/layout.tsx](D:/mohamed%20adel%20work/cesar-store/app/admin/layout.tsx:79)

Impact:

- The layout-level protection is internally inconsistent.
- There is risk of false confidence because a Promise is used in a boolean branch.

### 8. Registration page contains client-side admin-like behavior

Evidence:

- Client component performs password-probe sign-in behavior: [app/auth/register/page.tsx](D:/mohamed%20adel%20work/cesar-store/app/auth/register/page.tsx:26)
- Same page calls `supabase.auth.admin.listUsers()` from client logic: [app/auth/register/page.tsx](D:/mohamed%20adel%20work/cesar-store/app/auth/register/page.tsx:38)

Impact:

- Registration flow has brittle and non-standard auth behavior.
- This must move behind a safe server boundary before deeper auth cleanup.

### 9. Analytics SQL depends on `order_versions` that is design-only

Evidence:

- Analytics views query `public.order_versions`: [supabase/analytics/analytics_aggregations.sql](D:/mohamed%20adel%20work/cesar-store/supabase/analytics/analytics_aggregations.sql:43), [supabase/analytics/analytics_aggregations.sql](D:/mohamed%20adel%20work/cesar-store/supabase/analytics/analytics_aggregations.sql:146)
- The repo only contains a design reference for that table, not an applied migration: `supabase/design/order_versions.design.sql`

Impact:

- Analytics documentation and implementation intent are ahead of the actual executable schema.
- Financial reports built on this assumption are not portable or guaranteed.

## Source-of-Truth Matrix

| Concern | Runtime code depends on it | In `Database Schema.txt` | In repo migrations | Status |
|---|---|---|---|---|
| `orders.status` | Yes | Yes | No | Drift |
| `orders.order_token` | Yes | Yes | No | Drift |
| `orders.archived_at` | Yes | No | No | Drift |
| `create_order_atomic` | Yes | No | No | Drift |
| `admin_audit_logs` | Yes | No | No | Drift |
| `products.low_stock_threshold` | Yes | No | No | Drift |
| `order_versions` | Analytics/design | Design only | No | Drift |

## Risk Ordering for Surgical Fixes

1. Establish repository-backed schema truth for order-critical dependencies.
2. Unify admin session validation across middleware, layout, and Redis invalidation.
3. Remove client-side admin-like behavior from registration.
4. Freeze analytics assumptions that depend on `order_versions` until executable support exists.

## Surgical Phase-A Fix Plan

### Batch A1: Schema backfill only

- Add minimal migrations for:
  - `orders.status`
  - `orders.order_token`
  - `orders.archived_at`
  - any other order fields required by runtime
- Add migration or documented bootstrap for `create_order_atomic`
- Add migration for `admin_audit_logs`
- Add migration for `products.low_stock_threshold`

Constraint:

- Do not refactor order flow yet.
- Do not change data semantics before schema parity exists.

### Batch A2: Admin session consistency

- Make one validator the single source of truth.
- Ensure middleware, layout, and API routes all follow the same contract.
- Either remove or implement `admin_session_version` as a real invalidation mechanism.

Constraint:

- Keep cookie format stable unless a migration path is provided.

### Batch A3: Register flow hardening

- Remove `supabase.auth.admin.listUsers()` from client code.
- Replace account-existence heuristics with server-safe behavior.
- Preserve current UX contract as much as possible.

Constraint:

- Do not break email sign-up, login redirects, or trigger-based profile creation.

## Recommendation Before Logic Edits

Proceed with `Batch A1` first. Until schema parity is restored, every auth/order/admin fix risks solving the wrong problem against an undocumented database shape.
