alter table if exists public.wholesale_orders
  drop constraint if exists wholesale_orders_status_check;

update public.wholesale_orders
set status = case status
  when 'new' then 'requested'
  when 'reviewing' then 'confirmed'
  when 'contacted' then 'confirmed'
  when 'completed' then 'delivered'
  when 'cancelled' then 'canceled'
  else status
end
where status in ('new', 'reviewing', 'contacted', 'completed', 'cancelled');

alter table if exists public.wholesale_orders
  alter column status set default 'requested',
  add column if not exists stock_deducted_at timestamptz,
  add column if not exists stock_restored_at timestamptz,
  add constraint wholesale_orders_status_check check (
    status in (
      'requested',
      'confirmed',
      'preparing',
      'shipped',
      'delivered',
      'canceled'
    )
  );

create or replace function public.update_wholesale_order_status_atomic(
  p_order_id uuid,
  p_status text
)
returns setof public.wholesale_orders
language plpgsql
as $$
declare
  v_order public.wholesale_orders%rowtype;
  v_item record;
  v_product record;
  v_now timestamptz := now();
begin
  if p_status not in (
    'requested',
    'confirmed',
    'preparing',
    'shipped',
    'delivered',
    'canceled'
  ) then
    raise exception 'Invalid wholesale order status %', p_status;
  end if;

  select *
  into v_order
  from public.wholesale_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Wholesale order not found %', p_order_id;
  end if;

  if v_order.status = p_status then
    return query
      select *
      from public.wholesale_orders
      where id = p_order_id;
    return;
  end if;

  if not (
    (v_order.status = 'requested' and p_status in ('confirmed', 'canceled')) or
    (v_order.status = 'confirmed' and p_status in ('preparing', 'canceled')) or
    (v_order.status = 'preparing' and p_status = 'shipped') or
    (v_order.status = 'shipped' and p_status = 'delivered')
  ) then
    raise exception 'Invalid wholesale transition: % -> %', v_order.status, p_status;
  end if;

  if (
    p_status = 'confirmed' or
    (v_order.status = 'confirmed' and p_status = 'preparing')
  ) and v_order.stock_deducted_at is null then
    for v_item in
      select product_id, ordered_units
      from public.wholesale_order_items
      where order_id = p_order_id
      order by created_at asc
    loop
      select id, stock, is_active
      into v_product
      from public.products
      where id = v_item.product_id
      for update;

      if not found or coalesce(v_product.is_active, false) = false then
        raise exception 'Product is not available for wholesale order %', v_item.product_id;
      end if;

      if coalesce(v_product.stock, 0) < v_item.ordered_units then
        raise exception 'Insufficient stock for product %', v_item.product_id;
      end if;

      update public.products
      set
        stock = stock - v_item.ordered_units,
        is_active = (stock - v_item.ordered_units) > 0
      where id = v_item.product_id;
    end loop;

    update public.wholesale_orders
    set
      stock_deducted_at = v_now,
      stock_restored_at = null
    where id = p_order_id;
  end if;

  if p_status = 'canceled'
    and v_order.stock_deducted_at is not null
    and v_order.stock_restored_at is null
  then
    for v_item in
      select product_id, ordered_units
      from public.wholesale_order_items
      where order_id = p_order_id
      order by created_at desc
    loop
      update public.products
      set
        stock = stock + v_item.ordered_units,
        is_active = true
      where id = v_item.product_id;
    end loop;

    update public.wholesale_orders
    set stock_restored_at = v_now
    where id = p_order_id;
  end if;

  update public.wholesale_orders
  set
    status = p_status,
    updated_at = v_now
  where id = p_order_id;

  return query
    select *
    from public.wholesale_orders
    where id = p_order_id;
end;
$$;

revoke execute on function public.update_wholesale_order_status_atomic(uuid, text)
  from public, anon, authenticated;

grant execute on function public.update_wholesale_order_status_atomic(uuid, text)
  to service_role;
