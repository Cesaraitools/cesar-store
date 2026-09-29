-- Make retail order archive, restore, and permanent deletion transactional.
-- The functions are server-only and record every state transition so a
-- restored order cannot appear to have "returned" without an audit entry.

create or replace function public.set_retail_orders_archived_atomic(
  p_order_ids uuid[],
  p_archived boolean,
  p_admin_email text
)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_admin_email text := nullif(left(trim(coalesce(p_admin_email, '')), 200), '');
  v_requested_count integer;
  v_locked_count integer;
  v_matching_state_count integer;
  v_now timestamptz := now();
begin
  if v_admin_email is null then
    raise exception 'ADMIN_IDENTITY_REQUIRED';
  end if;

  v_requested_count := cardinality(p_order_ids);

  if v_requested_count is null or v_requested_count < 1 then
    raise exception 'ORDER_IDS_REQUIRED';
  end if;

  if v_requested_count > 50 then
    raise exception 'TOO_MANY_ORDER_IDS';
  end if;

  if (
    select count(distinct ids.order_id)
    from unnest(p_order_ids) as ids(order_id)
  )
     <> v_requested_count then
    raise exception 'DUPLICATE_ORDER_IDS';
  end if;

  perform 1
  from public.orders
  where id = any(p_order_ids)
  for update;

  select count(*)
  into v_locked_count
  from public.orders
  where id = any(p_order_ids);

  if v_locked_count <> v_requested_count then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select count(*)
  into v_matching_state_count
  from public.orders
  where id = any(p_order_ids)
    and (
      (p_archived and archived_at is null)
      or
      (not p_archived and archived_at is not null)
    );

  if v_matching_state_count <> v_requested_count then
    if p_archived then
      raise exception 'ORDER_ALREADY_ARCHIVED';
    end if;
    raise exception 'ORDER_NOT_ARCHIVED';
  end if;

  update public.orders
  set archived_at = case when p_archived then v_now else null end,
      updated_at = v_now
  where id = any(p_order_ids);

  insert into public.admin_audit_logs (
    admin_email,
    action,
    entity,
    entity_id,
    payload,
    created_at
  )
  select
    v_admin_email,
    case when p_archived then 'archive' else 'restore' end,
    'orders',
    order_id,
    jsonb_build_object('archived', p_archived),
    v_now
  from unnest(p_order_ids) as ids(order_id);

  return query
  select ids.order_id from unnest(p_order_ids) as ids(order_id);
end;
$$;

create or replace function public.hard_delete_retail_orders_atomic(
  p_order_ids uuid[],
  p_admin_email text
)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_admin_email text := nullif(left(trim(coalesce(p_admin_email, '')), 200), '');
  v_requested_count integer;
  v_locked_count integer;
  v_deleted_count integer;
  v_now timestamptz := now();
begin
  if v_admin_email is null then
    raise exception 'ADMIN_IDENTITY_REQUIRED';
  end if;

  v_requested_count := cardinality(p_order_ids);

  if v_requested_count is null or v_requested_count < 1 then
    raise exception 'ORDER_IDS_REQUIRED';
  end if;

  if v_requested_count > 50 then
    raise exception 'TOO_MANY_ORDER_IDS';
  end if;

  if (
    select count(distinct ids.order_id)
    from unnest(p_order_ids) as ids(order_id)
  )
     <> v_requested_count then
    raise exception 'DUPLICATE_ORDER_IDS';
  end if;

  perform 1
  from public.orders
  where id = any(p_order_ids)
    and archived_at is not null
  for update;

  select count(*)
  into v_locked_count
  from public.orders
  where id = any(p_order_ids)
    and archived_at is not null;

  if v_locked_count <> v_requested_count then
    raise exception 'ORDER_NOT_FOUND_OR_NOT_ARCHIVED';
  end if;

  insert into public.admin_audit_logs (
    admin_email,
    action,
    entity,
    entity_id,
    payload,
    created_at
  )
  select
    v_admin_email,
    'hard_delete',
    'orders',
    o.id,
    jsonb_build_object(
      'order_number', o.order_number,
      'status', o.status,
      'archived_at', o.archived_at
    ),
    v_now
  from public.orders o
  where o.id = any(p_order_ids);

  -- Invoices intentionally protect their parent order with ON DELETE RESTRICT.
  -- Remove the immutable invoice snapshot in the same transaction only after
  -- the administrator has explicitly chosen permanent deletion from archive.
  delete from public.invoices
  where order_id = any(p_order_ids);

  delete from public.orders
  where id = any(p_order_ids)
    and archived_at is not null;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> v_requested_count then
    raise exception 'ORDER_DELETE_COUNT_MISMATCH';
  end if;

  return query
  select ids.order_id from unnest(p_order_ids) as ids(order_id);
end;
$$;

revoke execute on function public.set_retail_orders_archived_atomic(
  uuid[], boolean, text
) from public, anon, authenticated;

revoke execute on function public.hard_delete_retail_orders_atomic(
  uuid[], text
) from public, anon, authenticated;

grant execute on function public.set_retail_orders_archived_atomic(
  uuid[], boolean, text
) to service_role;

grant execute on function public.hard_delete_retail_orders_atomic(
  uuid[], text
) to service_role;
