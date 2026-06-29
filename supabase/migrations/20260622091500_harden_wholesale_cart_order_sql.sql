create extension if not exists pgcrypto;

alter table if exists public.wholesale_orders
  drop constraint if exists wholesale_orders_order_token_key;

create unique index if not exists idx_wholesale_orders_customer_order_token
  on public.wholesale_orders(wholesale_customer_id, order_token)
  where order_token is not null;

create or replace function public.create_wholesale_order_from_cart_atomic(
  p_auth_user_id uuid,
  p_order_token text,
  p_notes text default null
)
returns setof public.wholesale_orders
language plpgsql
set search_path = public
as $$
declare
  v_customer public.wholesale_customers%rowtype;
  v_cart public.wholesale_carts%rowtype;
  v_existing_order public.wholesale_orders%rowtype;
  v_order public.wholesale_orders%rowtype;
  v_cart_item record;
  v_product public.products%rowtype;
  v_setting public.wholesale_product_settings%rowtype;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_line_total numeric := 0;
  v_min_order_units integer := 1;
  v_wholesale_price numeric := 0;
  v_image text;
  v_settings_snapshot jsonb;
  v_now timestamptz := now();
begin
  if nullif(trim(coalesce(p_order_token, '')), '') is null then
    raise exception 'Wholesale order token is required';
  end if;

  select *
  into v_customer
  from public.wholesale_customers
  where auth_user_id = p_auth_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active wholesale customer account is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_customer.id::text || ':' || trim(p_order_token))
  );

  select *
  into v_existing_order
  from public.wholesale_orders
  where order_token = trim(p_order_token)
    and auth_user_id = p_auth_user_id
    and wholesale_customer_id = v_customer.id;

  if found then
    return query
      select *
      from public.wholesale_orders
      where id = v_existing_order.id
        and auth_user_id = p_auth_user_id
        and wholesale_customer_id = v_customer.id;
    return;
  end if;

  select *
  into v_cart
  from public.wholesale_carts
  where wholesale_customer_id = v_customer.id
    and auth_user_id = p_auth_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Wholesale cart is empty';
  end if;

  if not exists (
    select 1
    from public.wholesale_cart_items
    where cart_id = v_cart.id
  ) then
    raise exception 'Wholesale cart is empty';
  end if;

  for v_cart_item in
    select *
    from public.wholesale_cart_items
    where cart_id = v_cart.id
    order by created_at asc
    for update
  loop
    select *
    into v_product
    from public.products
    where id = v_cart_item.product_id
    for update;

    if not found or coalesce(v_product.is_active, false) = false then
      raise exception 'Product is not available for wholesale order %', v_cart_item.product_id;
    end if;

    select *
    into v_setting
    from public.wholesale_product_settings
    where product_id = v_cart_item.product_id;

    if found and coalesce(v_setting.is_enabled, true) = false then
      raise exception 'Product is disabled for wholesale order %', v_cart_item.product_id;
    end if;

    v_wholesale_price := coalesce(v_setting.wholesale_price, 0);
    v_min_order_units := greatest(1, coalesce(v_setting.min_order_units, 1));

    if v_wholesale_price <= 0 then
      raise exception 'Wholesale price is missing for product %', v_cart_item.product_id;
    end if;

    if v_cart_item.ordered_units < v_min_order_units then
      raise exception 'Wholesale quantity is below minimum for product %', v_cart_item.product_id;
    end if;

    if coalesce(v_product.stock, 0) < v_cart_item.ordered_units then
      raise exception 'Insufficient stock for product %', v_cart_item.product_id;
    end if;

    v_image := case
      when jsonb_typeof(v_product.images_json) = 'array'
        and jsonb_array_length(v_product.images_json) > 0
        then v_product.images_json->>0
      else v_product.image_url
    end;

    v_line_total := v_cart_item.ordered_units * v_wholesale_price;
    v_subtotal := v_subtotal + v_line_total;
    v_settings_snapshot := jsonb_build_object(
      'wholesalePrice', v_wholesale_price,
      'unitType', 'piece',
      'unitLabel', 'قطعة',
      'quantityPerUnit', 1,
      'minOrderUnits', v_min_order_units,
      'notes', v_setting.notes
    );

    v_items_snapshot := v_items_snapshot || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'productNameAr', coalesce(v_product.name_ar, ''),
        'productNameEn', coalesce(v_product.name_en, v_product.name_ar, ''),
        'image', v_image,
        'category', coalesce(v_product.category, 'equipment'),
        'unitType', 'piece',
        'unitLabel', 'قطعة',
        'quantityPerUnit', 1,
        'minOrderUnits', v_min_order_units,
        'orderedUnits', v_cart_item.ordered_units,
        'unitPrice', v_wholesale_price,
        'lineTotal', v_line_total,
        'stockSnapshot', coalesce(v_product.stock, 0),
        'settingsSnapshot', v_settings_snapshot
      )
    );
  end loop;

  insert into public.wholesale_orders (
    order_token,
    wholesale_customer_id,
    auth_user_id,
    customer_snapshot,
    items_snapshot,
    status,
    subtotal,
    currency,
    notes,
    created_at,
    updated_at
  )
  values (
    trim(p_order_token),
    v_customer.id,
    p_auth_user_id,
    jsonb_build_object(
      'businessName', coalesce(v_customer.business_name, ''),
      'contactName', coalesce(v_customer.contact_name, ''),
      'phone', coalesce(v_customer.phone, ''),
      'whatsapp', coalesce(v_customer.whatsapp, ''),
      'email', v_customer.email,
      'governorate', coalesce(v_customer.governorate, ''),
      'city', coalesce(v_customer.city, ''),
      'address', v_customer.address
    ),
    v_items_snapshot,
    'requested',
    v_subtotal,
    'EGP',
    nullif(left(coalesce(trim(p_notes), ''), 1000), ''),
    v_now,
    v_now
  )
  returning * into v_order;

  for v_cart_item in
    select *
    from jsonb_array_elements(v_items_snapshot) as item_data(item)
  loop
    insert into public.wholesale_order_items (
      order_id,
      product_id,
      product_name_ar,
      product_name_en,
      image,
      unit_type,
      unit_label,
      quantity_per_unit,
      min_order_units,
      ordered_units,
      unit_price,
      line_total,
      stock_snapshot,
      settings_snapshot,
      created_at
    )
    values (
      v_order.id,
      (v_cart_item.item->>'productId')::uuid,
      coalesce(v_cart_item.item->>'productNameAr', ''),
      coalesce(v_cart_item.item->>'productNameEn', ''),
      v_cart_item.item->>'image',
      'piece',
      'قطعة',
      1,
      (v_cart_item.item->>'minOrderUnits')::integer,
      (v_cart_item.item->>'orderedUnits')::integer,
      (v_cart_item.item->>'unitPrice')::numeric,
      (v_cart_item.item->>'lineTotal')::numeric,
      (v_cart_item.item->>'stockSnapshot')::integer,
      coalesce(v_cart_item.item->'settingsSnapshot', '{}'::jsonb),
      v_now
    );
  end loop;

  update public.wholesale_carts
  set
    status = 'submitted',
    updated_at = v_now
  where id = v_cart.id;

  return query
    select *
    from public.wholesale_orders
    where id = v_order.id;
exception
  when unique_violation then
    select *
    into v_existing_order
    from public.wholesale_orders
    where order_token = trim(p_order_token)
      and auth_user_id = p_auth_user_id
      and wholesale_customer_id = v_customer.id;

    if found then
      return query
        select *
        from public.wholesale_orders
        where id = v_existing_order.id
          and auth_user_id = p_auth_user_id
          and wholesale_customer_id = v_customer.id;
      return;
    end if;

    raise;
end;
$$;

revoke execute on function public.create_wholesale_order_from_cart_atomic(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.create_wholesale_order_from_cart_atomic(uuid, text, text)
  to service_role;

create or replace function public.update_wholesale_order_status_atomic(
  p_order_id uuid,
  p_status text
)
returns setof public.wholesale_orders
language plpgsql
set search_path = public
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
        is_active = (stock - v_item.ordered_units) > 0,
        updated_at = v_now
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
        is_active = true,
        updated_at = v_now
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

create or replace function public.create_wholesale_order_return_atomic(
  p_order_id uuid,
  p_order_item_id uuid,
  p_returned_units integer,
  p_reason text,
  p_note text default null,
  p_created_by text default null
)
returns setof public.wholesale_order_returns
language plpgsql
set search_path = public
as $$
declare
  v_order public.wholesale_orders%rowtype;
  v_item public.wholesale_order_items%rowtype;
  v_product public.products%rowtype;
  v_already_returned integer := 0;
  v_returned_units integer := coalesce(p_returned_units, 0);
  v_now timestamptz := now();
  v_return_id uuid;
begin
  if v_returned_units <= 0 then
    raise exception 'Returned quantity must be greater than zero';
  end if;

  select *
  into v_order
  from public.wholesale_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Wholesale order not found %', p_order_id;
  end if;

  if v_order.status <> 'delivered' then
    raise exception 'Wholesale returns are allowed only after delivery';
  end if;

  select *
  into v_item
  from public.wholesale_order_items
  where id = p_order_item_id
    and order_id = p_order_id
  for update;

  if not found then
    raise exception 'Wholesale order item not found %', p_order_item_id;
  end if;

  select coalesce(sum(returned_units), 0)
  into v_already_returned
  from public.wholesale_order_returns
  where order_item_id = p_order_item_id;

  if v_already_returned + v_returned_units > v_item.ordered_units then
    raise exception 'Returned quantity exceeds ordered quantity';
  end if;

  select *
  into v_product
  from public.products
  where id = v_item.product_id
  for update;

  if not found then
    raise exception 'Product not found for returned item %', v_item.product_id;
  end if;

  update public.products
  set
    stock = coalesce(stock, 0) + v_returned_units,
    is_active = true,
    updated_at = v_now
  where id = v_item.product_id;

  insert into public.wholesale_order_returns (
    order_id,
    order_item_id,
    product_id,
    returned_units,
    reason,
    note,
    created_by,
    created_at
  )
  values (
    p_order_id,
    p_order_item_id,
    v_item.product_id,
    v_returned_units,
    left(coalesce(nullif(trim(p_reason), ''), 'unspecified'), 500),
    nullif(left(coalesce(trim(p_note), ''), 1000), ''),
    nullif(left(coalesce(trim(p_created_by), ''), 200), ''),
    v_now
  )
  returning id into v_return_id;

  update public.wholesale_orders
  set updated_at = v_now
  where id = p_order_id;

  return query
    select *
    from public.wholesale_order_returns
    where id = v_return_id;
end;
$$;

revoke execute on function public.create_wholesale_order_return_atomic(uuid, uuid, integer, text, text, text)
  from public, anon, authenticated;

grant execute on function public.create_wholesale_order_return_atomic(uuid, uuid, integer, text, text, text)
  to service_role;
