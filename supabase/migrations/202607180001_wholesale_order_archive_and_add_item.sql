alter table if exists public.wholesale_orders
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

create index if not exists idx_wholesale_orders_archived_at
  on public.wholesale_orders(archived_at);

create or replace function public.archive_wholesale_order_atomic(
  p_order_id uuid,
  p_archived boolean,
  p_admin_email text default null
)
returns setof public.wholesale_orders
language plpgsql
set search_path = public
as $$
declare
  v_order public.wholesale_orders%rowtype;
  v_now timestamptz := now();
begin
  select *
  into v_order
  from public.wholesale_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Wholesale order not found %', p_order_id;
  end if;

  update public.wholesale_orders
  set
    archived_at = case when coalesce(p_archived, false) then v_now else null end,
    archived_by = case
      when coalesce(p_archived, false)
        then nullif(left(coalesce(trim(p_admin_email), ''), 200), '')
      else null
    end,
    updated_at = v_now
  where id = p_order_id;

  insert into public.admin_audit_logs (
    admin_email,
    action,
    entity,
    entity_id,
    payload,
    created_at
  )
  values (
    coalesce(nullif(left(coalesce(trim(p_admin_email), ''), 200), ''), 'admin'),
    case when coalesce(p_archived, false) then 'archive' else 'restore' end,
    'wholesale_orders',
    p_order_id::text,
    jsonb_build_object('archived', coalesce(p_archived, false)),
    v_now
  );

  return query
    select *
    from public.wholesale_orders
    where id = p_order_id;
end;
$$;

revoke execute on function public.archive_wholesale_order_atomic(uuid, boolean, text)
  from public, anon, authenticated;

grant execute on function public.archive_wholesale_order_atomic(uuid, boolean, text)
  to service_role;

create or replace function public.add_wholesale_order_item_atomic(
  p_order_id uuid,
  p_product_id uuid,
  p_ordered_units integer,
  p_variant_key text default '',
  p_created_by text default null
)
returns setof public.wholesale_orders
language plpgsql
set search_path = public
as $$
declare
  v_order public.wholesale_orders%rowtype;
  v_product public.products%rowtype;
  v_setting public.wholesale_product_settings%rowtype;
  v_existing_item public.wholesale_order_items%rowtype;
  v_variant jsonb;
  v_variant_key text := coalesce(trim(p_variant_key), '');
  v_variant_snapshot jsonb;
  v_variant_stock integer := 0;
  v_has_variants boolean := false;
  v_ordered_units integer := coalesce(p_ordered_units, 0);
  v_existing_product_units integer := 0;
  v_min_order_units integer := 1;
  v_wholesale_price numeric := 0;
  v_line_total numeric := 0;
  v_image text;
  v_settings_snapshot jsonb;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_now timestamptz := now();
begin
  if v_ordered_units <= 0 then
    raise exception 'Ordered units must be greater than zero';
  end if;

  select *
  into v_order
  from public.wholesale_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Wholesale order not found %', p_order_id;
  end if;

  if v_order.status <> 'preparing' then
    raise exception 'Items can be added only while wholesale order is preparing';
  end if;

  if v_order.archived_at is not null then
    raise exception 'Archived wholesale orders cannot be changed';
  end if;

  if v_order.stock_deducted_at is null or v_order.stock_restored_at is not null then
    raise exception 'Wholesale order stock state is not ready for adding items';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found or coalesce(v_product.is_active, false) = false then
    raise exception 'Product is not available for wholesale order %', p_product_id;
  end if;

  select *
  into v_setting
  from public.wholesale_product_settings
  where product_id = p_product_id;

  if found and coalesce(v_setting.is_enabled, true) = false then
    raise exception 'Product is disabled for wholesale order %', p_product_id;
  end if;

  v_wholesale_price := coalesce(v_setting.wholesale_price, 0);
  v_min_order_units := greatest(1, coalesce(v_setting.min_order_units, 1));

  if v_wholesale_price <= 0 then
    raise exception 'Wholesale price is missing for product %', p_product_id;
  end if;

  v_variant_stock := coalesce(v_product.stock, 0);
  v_has_variants :=
    jsonb_typeof(coalesce(v_product.variants_json, '[]'::jsonb)) = 'array'
    and jsonb_array_length(coalesce(v_product.variants_json, '[]'::jsonb)) > 0;

  if v_has_variants then
    if v_variant_key = '' then
      raise exception 'Product variant is required %', p_product_id;
    end if;

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
    v_variant_snapshot := jsonb_build_object('key', v_variant_key);
  else
    v_variant_key := '';
    v_variant_snapshot := null;
  end if;

  select coalesce(sum(ordered_units), 0)
  into v_existing_product_units
  from public.wholesale_order_items
  where order_id = p_order_id
    and product_id = p_product_id;

  if v_existing_product_units + v_ordered_units < v_min_order_units then
    raise exception 'Wholesale quantity is below minimum for product %', p_product_id;
  end if;

  if v_variant_stock < v_ordered_units then
    raise exception 'Insufficient stock for product %', p_product_id;
  end if;

  v_image := case
    when v_has_variants and nullif(v_variant->>'image', '') is not null
      then v_variant->>'image'
    when jsonb_typeof(v_product.images_json) = 'array'
      and jsonb_array_length(v_product.images_json) > 0
      then v_product.images_json->>0
    else v_product.image_url
  end;

  v_line_total := v_ordered_units * v_wholesale_price;
  v_settings_snapshot := jsonb_build_object(
    'wholesalePrice', v_wholesale_price,
    'unitType', 'piece',
    'unitLabel', 'قطعة',
    'quantityPerUnit', 1,
    'minOrderUnits', v_min_order_units,
    'notes', v_setting.notes,
    'addedByAdmin', true
  );

  perform public.wholesale_adjust_product_stock(
    p_product_id,
    v_variant_key,
    -v_ordered_units,
    true
  );

  select *
  into v_existing_item
  from public.wholesale_order_items
  where order_id = p_order_id
    and product_id = p_product_id
    and coalesce(variant_key, '') = v_variant_key
  for update;

  if found then
    update public.wholesale_order_items
    set
      ordered_units = ordered_units + v_ordered_units,
      line_total = line_total + v_line_total,
      stock_snapshot = greatest(stock_snapshot, v_variant_stock)
    where id = v_existing_item.id;
  else
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
      p_order_id,
      p_product_id,
      coalesce(v_product.name_ar, ''),
      coalesce(v_product.name_en, v_product.name_ar, ''),
      v_image,
      v_variant_key,
      v_variant_snapshot,
      'piece',
      'قطعة',
      1,
      v_min_order_units,
      v_ordered_units,
      v_wholesale_price,
      v_line_total,
      v_variant_stock,
      v_settings_snapshot,
      v_now
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'productId', item.product_id,
        'productNameAr', coalesce(item.product_name_ar, ''),
        'productNameEn', coalesce(item.product_name_en, ''),
        'image', item.image,
        'variantKey', coalesce(item.variant_key, ''),
        'variant', item.variant_snapshot,
        'unitType', 'piece',
        'unitLabel', 'قطعة',
        'quantityPerUnit', 1,
        'minOrderUnits', item.min_order_units,
        'orderedUnits', item.ordered_units,
        'unitPrice', item.unit_price,
        'lineTotal', item.line_total,
        'stockSnapshot', item.stock_snapshot,
        'settingsSnapshot', item.settings_snapshot
      )
      order by item.created_at asc, item.id asc
    ),
    '[]'::jsonb
  )
  into v_items_snapshot
  from public.wholesale_order_items as item
  where item.order_id = p_order_id;

  update public.wholesale_orders
  set
    subtotal = subtotal + v_line_total,
    items_snapshot = v_items_snapshot,
    updated_at = v_now
  where id = p_order_id;

  insert into public.admin_audit_logs (
    admin_email,
    action,
    entity,
    entity_id,
    payload,
    created_at
  )
  values (
    coalesce(nullif(left(coalesce(trim(p_created_by), ''), 200), ''), 'admin'),
    'add_item',
    'wholesale_orders',
    p_order_id::text,
    jsonb_build_object(
      'productId', p_product_id,
      'variantKey', v_variant_key,
      'orderedUnits', v_ordered_units,
      'lineTotal', v_line_total
    ),
    v_now
  );

  return query
    select *
    from public.wholesale_orders
    where id = p_order_id;
end;
$$;

revoke execute on function public.add_wholesale_order_item_atomic(uuid, uuid, integer, text, text)
  from public, anon, authenticated;

grant execute on function public.add_wholesale_order_item_atomic(uuid, uuid, integer, text, text)
  to service_role;
