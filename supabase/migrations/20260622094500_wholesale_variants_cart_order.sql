alter table if exists public.wholesale_cart_items
  add column if not exists variant_key text not null default '',
  add column if not exists variant_snapshot jsonb;

alter table if exists public.wholesale_order_items
  add column if not exists variant_key text not null default '',
  add column if not exists variant_snapshot jsonb;

drop index if exists public.idx_wholesale_cart_items_unique_product;

create unique index if not exists idx_wholesale_cart_items_unique_product_variant
  on public.wholesale_cart_items(cart_id, product_id, variant_key);

create index if not exists idx_wholesale_cart_items_variant_key
  on public.wholesale_cart_items(variant_key);

create index if not exists idx_wholesale_order_items_variant_key
  on public.wholesale_order_items(variant_key);

create or replace function public.wholesale_adjust_product_stock(
  p_product_id uuid,
  p_variant_key text,
  p_delta integer,
  p_require_active boolean default true
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_variant_key text := coalesce(trim(p_variant_key), '');
  v_has_variants boolean := false;
  v_variant jsonb;
  v_variant_stock integer := 0;
  v_next_variant_stock integer := 0;
  v_next_stock integer := 0;
  v_next_variants jsonb;
  v_now timestamptz := now();
begin
  if coalesce(p_delta, 0) = 0 then
    return;
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found %', p_product_id;
  end if;

  if p_require_active and coalesce(v_product.is_active, false) = false then
    raise exception 'Product is not active %', p_product_id;
  end if;

  v_has_variants :=
    v_variant_key <> ''
    and jsonb_typeof(coalesce(v_product.variants_json, '[]'::jsonb)) = 'array'
    and jsonb_array_length(coalesce(v_product.variants_json, '[]'::jsonb)) > 0;

  if v_has_variants then
    select elem
    into v_variant
    from jsonb_array_elements(coalesce(v_product.variants_json, '[]'::jsonb)) as elem
    where coalesce(elem->>'key', elem->>'id', '') = v_variant_key
    limit 1;

    if not found then
      raise exception 'Product variant not found %', v_variant_key;
    end if;

    if p_require_active and coalesce((v_variant->>'active')::boolean, true) = false then
      raise exception 'Product variant is not active %', v_variant_key;
    end if;

    v_variant_stock := case
      when coalesce(v_variant->>'stock', '') ~ '^[0-9]+$'
        then (v_variant->>'stock')::integer
      else coalesce(v_product.stock, 0)
    end;

    if p_delta < 0 and v_variant_stock < abs(p_delta) then
      raise exception 'Insufficient variant stock %', v_variant_key;
    end if;
  end if;

  if p_delta < 0 and coalesce(v_product.stock, 0) < abs(p_delta) then
    raise exception 'Insufficient stock for product %', p_product_id;
  end if;

  v_next_stock := greatest(0, coalesce(v_product.stock, 0) + p_delta);

  if v_has_variants then
    v_next_variant_stock := greatest(0, v_variant_stock + p_delta);

    select jsonb_agg(
      case
        when coalesce(elem->>'key', elem->>'id', '') = v_variant_key then
          jsonb_set(
            jsonb_set(
              elem,
              '{stock}',
              to_jsonb(v_next_variant_stock),
              true
            ),
            '{active}',
            to_jsonb(case when p_delta > 0 then true else v_next_variant_stock > 0 end),
            true
          )
        else elem
      end
      order by ordinality
    )
    into v_next_variants
    from jsonb_array_elements(coalesce(v_product.variants_json, '[]'::jsonb))
      with ordinality as variant_rows(elem, ordinality);
  end if;

  update public.products
  set
    stock = v_next_stock,
    variants_json = case when v_has_variants then v_next_variants else variants_json end,
    is_active = case when p_delta > 0 then true else v_next_stock > 0 end,
    updated_at = v_now
  where id = p_product_id;
end;
$$;

revoke execute on function public.wholesale_adjust_product_stock(uuid, text, integer, boolean)
  from public, anon, authenticated;

grant execute on function public.wholesale_adjust_product_stock(uuid, text, integer, boolean)
  to service_role;

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
  v_variant jsonb;
  v_variant_key text := '';
  v_variant_snapshot jsonb;
  v_variant_stock integer := 0;
  v_has_variants boolean := false;
  v_group_ordered_units integer := 0;
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
    v_variant_key := coalesce(trim(v_cart_item.variant_key), '');
    v_variant_snapshot := null;
    v_variant_stock := coalesce(v_product.stock, 0);
    v_has_variants :=
      jsonb_typeof(coalesce(v_product.variants_json, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(v_product.variants_json, '[]'::jsonb)) > 0;

    if v_wholesale_price <= 0 then
      raise exception 'Wholesale price is missing for product %', v_cart_item.product_id;
    end if;

    if v_has_variants then
      select elem
      into v_variant
      from jsonb_array_elements(coalesce(v_product.variants_json, '[]'::jsonb)) as elem
      where coalesce(elem->>'key', elem->>'id', '') = v_variant_key
        and coalesce((elem->>'active')::boolean, true) = true
      limit 1;

      if not found then
        raise exception 'Product variant is not available %', v_variant_key;
      end if;

      v_variant_stock := case
        when coalesce(v_variant->>'stock', '') ~ '^[0-9]+$'
          then (v_variant->>'stock')::integer
        else coalesce(v_product.stock, 0)
      end;
      v_variant_snapshot := coalesce(
        v_cart_item.variant_snapshot,
        jsonb_build_object('key', v_variant_key)
      );
    end if;

    select coalesce(sum(ordered_units), 0)
    into v_group_ordered_units
    from public.wholesale_cart_items
    where cart_id = v_cart.id
      and product_id = v_cart_item.product_id;

    if (case when v_has_variants then v_group_ordered_units else v_cart_item.ordered_units end) < v_min_order_units then
      raise exception 'Wholesale quantity is below minimum for product %', v_cart_item.product_id;
    end if;

    if v_variant_stock < v_cart_item.ordered_units then
      raise exception 'Insufficient stock for product %', v_cart_item.product_id;
    end if;

    v_image := case
      when v_has_variants and nullif(v_variant->>'image', '') is not null
        then v_variant->>'image'
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
        'variantKey', v_variant_key,
        'variant', v_variant_snapshot,
        'category', coalesce(v_product.category, 'equipment'),
        'unitType', 'piece',
        'unitLabel', 'قطعة',
        'quantityPerUnit', 1,
        'minOrderUnits', v_min_order_units,
        'orderedUnits', v_cart_item.ordered_units,
        'unitPrice', v_wholesale_price,
        'lineTotal', v_line_total,
        'stockSnapshot', v_variant_stock,
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
      variant_key,
      variant_snapshot,
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
      coalesce(v_cart_item.item->>'variantKey', ''),
      v_cart_item.item->'variant',
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
      select product_id, variant_key, ordered_units
      from public.wholesale_order_items
      where order_id = p_order_id
      order by created_at asc
    loop
      perform public.wholesale_adjust_product_stock(
        v_item.product_id,
        coalesce(v_item.variant_key, ''),
        -v_item.ordered_units,
        true
      );
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
      select product_id, variant_key, ordered_units
      from public.wholesale_order_items
      where order_id = p_order_id
      order by created_at desc
    loop
      perform public.wholesale_adjust_product_stock(
        v_item.product_id,
        coalesce(v_item.variant_key, ''),
        v_item.ordered_units,
        false
      );
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

  perform public.wholesale_adjust_product_stock(
    v_item.product_id,
    coalesce(v_item.variant_key, ''),
    v_returned_units,
    false
  );

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
