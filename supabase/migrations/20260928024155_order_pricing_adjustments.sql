-- Order-level shipping and discount adjustments.
-- Existing numeric columns remain the source of truth; these additions make
-- pending shipping distinct from an explicit free-shipping decision and add
-- optimistic concurrency plus an audit trail.

alter table public.orders
  add column if not exists shipping_status text not null default 'pending',
  add column if not exists discount_reason text,
  add column if not exists pricing_updated_at timestamptz,
  add column if not exists pricing_updated_by text,
  add column if not exists pricing_version integer not null default 0;

alter table public.admin_audit_logs
  add column if not exists payload jsonb;

update public.orders
set shipping_status = case
  when status in ('shipped', 'delivered', 'canceled') then 'legacy'
  else 'pending'
end
where shipping_status = 'pending'
  and shipping_fee = 0
  and discount = 0
  and pricing_version = 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_shipping_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_shipping_status_check
      check (shipping_status in ('pending', 'set', 'waived', 'legacy'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_pricing_nonnegative_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_pricing_nonnegative_check
      check (
        subtotal >= 0
        and shipping_fee >= 0
        and discount >= 0
        and total >= 0
        and pricing_version >= 0
      );
  end if;
end
$$;

create or replace function public.update_order_pricing(
  p_order_id uuid,
  p_shipping_status text,
  p_shipping_fee numeric,
  p_discount numeric,
  p_discount_reason text,
  p_admin_email text,
  p_expected_version integer default null
)
returns table (
  order_id uuid,
  subtotal numeric,
  shipping_fee numeric,
  shipping_status text,
  discount numeric,
  discount_reason text,
  total numeric,
  pricing_version integer,
  pricing_updated_at timestamptz,
  pricing_updated_by text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_shipping_fee numeric;
  v_discount numeric;
  v_reason text;
  v_admin_email text;
  v_total numeric;
  v_now timestamptz := now();
begin
  if p_shipping_status not in ('pending', 'set', 'waived') then
    raise exception 'INVALID_SHIPPING_STATUS';
  end if;

  if p_shipping_fee is null or p_discount is null then
    raise exception 'PRICING_VALUES_REQUIRED';
  end if;

  v_shipping_fee := round(p_shipping_fee, 2);
  v_discount := round(p_discount, 2);
  v_reason := nullif(left(trim(coalesce(p_discount_reason, '')), 500), '');
  v_admin_email := nullif(left(trim(coalesce(p_admin_email, '')), 200), '');

  if v_admin_email is null then
    raise exception 'ADMIN_IDENTITY_REQUIRED';
  end if;

  if v_shipping_fee < 0 or v_discount < 0 then
    raise exception 'NEGATIVE_PRICING_VALUE';
  end if;

  if p_shipping_status in ('pending', 'waived') and v_shipping_fee <> 0 then
    raise exception 'SHIPPING_FEE_MUST_BE_ZERO';
  end if;

  if p_shipping_status = 'set' and v_shipping_fee <= 0 then
    raise exception 'SHIPPING_FEE_REQUIRED';
  end if;

  if v_discount > 0 and v_reason is null then
    raise exception 'DISCOUNT_REASON_REQUIRED';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status not in ('requested', 'confirmed', 'preparing') then
    raise exception 'ORDER_PRICING_LOCKED';
  end if;

  if p_expected_version is not null
     and v_order.pricing_version <> p_expected_version then
    raise exception 'PRICING_VERSION_CONFLICT';
  end if;

  if v_discount > v_order.subtotal then
    raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL';
  end if;

  v_total := round(v_order.subtotal + v_shipping_fee - v_discount, 2);

  update public.orders as target
  set shipping_fee = v_shipping_fee,
      shipping_status = p_shipping_status,
      discount = v_discount,
      discount_reason = case when v_discount > 0 then v_reason else null end,
      total = v_total,
      pricing_version = target.pricing_version + 1,
      pricing_updated_at = v_now,
      pricing_updated_by = v_admin_email,
      updated_at = v_now
  where target.id = p_order_id;

  insert into public.admin_audit_logs (
    admin_email,
    action,
    entity,
    entity_id,
    payload,
    created_at
  ) values (
    v_admin_email,
    'order_pricing_updated',
    'order',
    p_order_id,
    jsonb_build_object(
      'before', jsonb_build_object(
        'shipping_fee', v_order.shipping_fee,
        'shipping_status', v_order.shipping_status,
        'discount', v_order.discount,
        'discount_reason', v_order.discount_reason,
        'total', v_order.total,
        'pricing_version', v_order.pricing_version
      ),
      'after', jsonb_build_object(
        'shipping_fee', v_shipping_fee,
        'shipping_status', p_shipping_status,
        'discount', v_discount,
        'discount_reason', case when v_discount > 0 then v_reason else null end,
        'total', v_total,
        'pricing_version', v_order.pricing_version + 1
      )
    ),
    v_now
  );

  return query
  select
    o.id,
    o.subtotal,
    o.shipping_fee,
    o.shipping_status,
    o.discount,
    o.discount_reason,
    o.total,
    o.pricing_version,
    o.pricing_updated_at,
    o.pricing_updated_by
  from public.orders o
  where o.id = p_order_id;
end;
$$;

revoke execute on function public.update_order_pricing(
  uuid, text, numeric, numeric, text, text, integer
) from public, anon, authenticated;

grant execute on function public.update_order_pricing(
  uuid, text, numeric, numeric, text, text, integer
) to service_role;
