create or replace function public.create_wholesale_order_from_cart_atomic(
  p_auth_user_id uuid,
  p_order_token text,
  p_notes text default null
)
returns setof public.wholesale_orders
language plpgsql
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
end;
$$;

revoke execute on function public.create_wholesale_order_from_cart_atomic(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.create_wholesale_order_from_cart_atomic(uuid, text, text)
  to service_role;
