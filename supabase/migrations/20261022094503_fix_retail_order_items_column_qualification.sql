-- Allow an order administrator to replace the complete retail order item set.
-- Inventory, snapshots, totals, the normalized order_items table, any persisted
-- invoice snapshot, optimistic concurrency, and the audit trail are updated in
-- one PostgreSQL transaction.

create or replace function public.update_order_items_atomic(
  p_order_id uuid,
  p_items jsonb,
  p_admin_email text,
  p_expected_version integer default null
)
returns table (
  order_id uuid,
  subtotal numeric,
  shipping_fee numeric,
  discount numeric,
  total numeric,
  pricing_version integer,
  pricing_updated_at timestamptz,
  pricing_updated_by text,
  items_snapshot jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_old_item jsonb;
  v_variant jsonb;
  v_variant_snapshot jsonb;
  v_variants_next jsonb;
  v_product_id uuid;
  v_variant_key text;
  v_quantity integer;
  v_old_quantity integer;
  v_new_product_quantity integer;
  v_old_product_quantity integer;
  v_product_delta integer;
  v_variant_delta integer;
  v_variant_stock integer;
  v_next_variant_stock integer;
  v_next_stock integer;
  v_price numeric;
  v_name_ar text;
  v_name_en text;
  v_name text;
  v_image text;
  v_new_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_admin_email text;
  v_now timestamptz := now();
  v_item_count integer := 0;
  v_unique_count integer := 0;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'TOO_MANY_ORDER_ITEMS';
  end if;

  v_admin_email := nullif(left(trim(coalesce(p_admin_email, '')), 200), '');
  if v_admin_email is null then
    raise exception 'ADMIN_IDENTITY_REQUIRED';
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
    raise exception 'ORDER_ITEMS_LOCKED';
  end if;

  if p_expected_version is not null
     and v_order.pricing_version <> p_expected_version then
    raise exception 'PRICING_VERSION_CONFLICT';
  end if;

  -- Validate every input before casting it in the inventory queries below.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'INVALID_ORDER_ITEM';
    end;

    v_variant_key := left(trim(coalesce(v_item->>'variant_key', '')), 256);

    if v_product_id is null
       or v_quantity is null
       or v_quantity <= 0
       or v_quantity > 9999 then
      raise exception 'INVALID_ORDER_ITEM';
    end if;
  end loop;

  select count(*), count(distinct concat(product_id::text, '::', variant_key))
  into v_item_count, v_unique_count
  from (
    select
      nullif(value->>'product_id', '')::uuid as product_id,
      left(trim(coalesce(value->>'variant_key', '')), 256) as variant_key
    from jsonb_array_elements(p_items)
  ) requested_items;

  if v_item_count <> v_unique_count then
    raise exception 'DUPLICATE_ORDER_ITEM';
  end if;

  -- Lock all affected product rows in a deterministic order to avoid stock
  -- races and deadlocks between simultaneous admin/order operations.
  perform product.id
  from public.products as product
  where product.id in (
    select nullif(value->>'product_id', '')::uuid
    from jsonb_array_elements(p_items)
    union
    select nullif(value->>'product_id', '')::uuid
    from jsonb_array_elements(coalesce(v_order.items_snapshot, '[]'::jsonb))
    where nullif(value->>'product_id', '') is not null
  )
  order by product.id
  for update;

  -- Rebuild the immutable display snapshot. Existing lines retain the price
  -- agreed at checkout; only newly added lines use the current catalog price.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_variant_key := left(trim(coalesce(v_item->>'variant_key', '')), 256);

    select *
    into v_product
    from public.products
    where id = v_product_id;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    select value
    into v_old_item
    from jsonb_array_elements(coalesce(v_order.items_snapshot, '[]'::jsonb))
    where value->>'product_id' = v_product_id::text
      and coalesce(value->>'variant_key', value->'variant'->>'key', '') = v_variant_key
    limit 1;

    select coalesce(sum((value->>'quantity')::integer), 0)
    into v_old_quantity
    from jsonb_array_elements(coalesce(v_order.items_snapshot, '[]'::jsonb))
    where value->>'product_id' = v_product_id::text
      and coalesce(value->>'variant_key', value->'variant'->>'key', '') = v_variant_key;

    v_variant := null;
    v_variant_snapshot := '{}'::jsonb;

    if jsonb_typeof(coalesce(v_product.variants_json, '[]'::jsonb)) = 'array'
       and jsonb_array_length(coalesce(v_product.variants_json, '[]'::jsonb)) > 0 then
      if v_variant_key = '' then
        raise exception 'VARIANT_REQUIRED';
      end if;

      select value
      into v_variant
      from jsonb_array_elements(v_product.variants_json)
      where coalesce(value->>'key', value->>'id', '') = v_variant_key
      limit 1;

      if v_variant is null then
        raise exception 'VARIANT_NOT_FOUND';
      end if;

      if v_quantity > v_old_quantity
         and coalesce((v_variant->>'active')::boolean, true) is false then
        raise exception 'VARIANT_INACTIVE';
      end if;

      if v_old_item is not null
         and jsonb_typeof(coalesce(v_old_item->'variant', '{}'::jsonb)) = 'object'
         and coalesce(v_old_item->'variant', '{}'::jsonb) <> '{}'::jsonb then
        v_variant_snapshot := v_old_item->'variant';
      else
        select jsonb_build_object(
          'key', v_variant_key,
          'label_ar', coalesce(
            string_agg(
              concat(option_row.option_data->'name'->>'ar', ': ', selected_value.value_data->'label'->>'ar'),
              ' - ' order by option_row.option_ordinality
            ),
            ''
          ),
          'label_en', coalesce(
            string_agg(
              concat(option_row.option_data->'name'->>'en', ': ', selected_value.value_data->'label'->>'en'),
              ' - ' order by option_row.option_ordinality
            ),
            ''
          ),
          'selected_options', coalesce(
            jsonb_agg(
              jsonb_build_object(
                'option_id', option_row.option_data->>'id',
                'option_name_ar', option_row.option_data->'name'->>'ar',
                'option_name_en', option_row.option_data->'name'->>'en',
                'value_id', selected_value.value_data->>'id',
                'value_ar', selected_value.value_data->'label'->>'ar',
                'value_en', selected_value.value_data->'label'->>'en'
              ) order by option_row.option_ordinality
            ),
            '[]'::jsonb
          )
        )
        into v_variant_snapshot
        from jsonb_array_elements(coalesce(v_product.variant_options_json, '[]'::jsonb))
          with ordinality as option_row(option_data, option_ordinality)
        join lateral (
          select value_data
          from jsonb_array_elements(coalesce(option_row.option_data->'values', '[]'::jsonb))
            as values_row(value_data)
          where value_data->>'id' = v_variant->'selections'->>(option_row.option_data->>'id')
          limit 1
        ) selected_value on true;

        v_variant_snapshot := coalesce(
          v_variant_snapshot,
          jsonb_build_object(
            'key', v_variant_key,
            'label_ar', v_variant_key,
            'label_en', v_variant_key,
            'selected_options', '[]'::jsonb
          )
        );
      end if;
    elsif v_variant_key <> '' then
      raise exception 'VARIANT_NOT_ALLOWED';
    end if;

    if v_quantity > v_old_quantity and coalesce(v_product.is_active, false) is false then
      raise exception 'PRODUCT_INACTIVE';
    end if;

    if v_old_item is not null then
      v_price := round(coalesce((v_old_item->>'price')::numeric, 0), 2);
      v_name_ar := coalesce(v_old_item->>'name_ar', v_product.name_ar, '');
      v_name_en := coalesce(v_old_item->>'name_en', v_product.name_en, v_name_ar, '');
      v_name := coalesce(nullif(v_old_item->>'name', ''), nullif(v_name_ar, ''), nullif(v_name_en, ''), 'Product');
      v_image := nullif(v_old_item->>'image', '');
    else
      v_price := round(
        case
          when v_variant is not null
               and coalesce((v_variant->>'price')::numeric, 0) > 0
            then (v_variant->>'price')::numeric
          else coalesce(v_product.price, 0)
        end,
        2
      );
      v_name_ar := coalesce(v_product.name_ar, '');
      v_name_en := coalesce(v_product.name_en, v_name_ar, '');
      v_name := coalesce(nullif(v_name_ar, ''), nullif(v_name_en, ''), 'Product');
      v_image := coalesce(
        nullif(v_variant->>'image', ''),
        case
          when jsonb_typeof(v_product.images_json) = 'array'
            then nullif(v_product.images_json->>0, '')
          else null
        end,
        nullif(v_product.image_url, '')
      );
    end if;

    if v_price < 0 then
      raise exception 'INVALID_PRODUCT_PRICE';
    end if;

    v_new_items := v_new_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id,
        'name_ar', v_name_ar,
        'name_en', v_name_en,
        'name', v_name,
        'price', v_price,
        'quantity', v_quantity,
        'image', v_image,
        'variant_key', v_variant_key,
        'variant', v_variant_snapshot
      )
    );
    v_subtotal := v_subtotal + (v_price * v_quantity);
  end loop;

  v_subtotal := round(v_subtotal, 2);

  if coalesce(v_order.discount, 0) > v_subtotal then
    raise exception 'DISCOUNT_EXCEEDS_NEW_SUBTOTAL';
  end if;

  -- Apply only the net inventory difference for every affected product and
  -- variant. Negative deltas restore stock; positive deltas reserve stock.
  for v_product in
    select product.*
    from public.products as product
    where product.id in (
      select nullif(value->>'product_id', '')::uuid
      from jsonb_array_elements(p_items)
      union
      select nullif(value->>'product_id', '')::uuid
      from jsonb_array_elements(coalesce(v_order.items_snapshot, '[]'::jsonb))
      where nullif(value->>'product_id', '') is not null
    )
    order by product.id
  loop
    select coalesce(sum((value->>'quantity')::integer), 0)
    into v_new_product_quantity
    from jsonb_array_elements(p_items)
    where value->>'product_id' = v_product.id::text;

    select coalesce(sum((value->>'quantity')::integer), 0)
    into v_old_product_quantity
    from jsonb_array_elements(coalesce(v_order.items_snapshot, '[]'::jsonb))
    where value->>'product_id' = v_product.id::text;

    v_product_delta := v_new_product_quantity - v_old_product_quantity;
    v_next_stock := coalesce(v_product.stock, 0) - v_product_delta;

    if v_next_stock < 0 then
      raise exception 'INSUFFICIENT_PRODUCT_STOCK';
    end if;

    v_variants_next := coalesce(v_product.variants_json, '[]'::jsonb);

    if jsonb_typeof(v_variants_next) = 'array' then
      for v_variant in select value from jsonb_array_elements(v_variants_next)
      loop
        v_variant_key := coalesce(v_variant->>'key', v_variant->>'id', '');
        if v_variant_key = '' then
          continue;
        end if;

        select
          coalesce((
            select sum((value->>'quantity')::integer)
            from jsonb_array_elements(p_items)
            where value->>'product_id' = v_product.id::text
              and coalesce(value->>'variant_key', '') = v_variant_key
          ), 0)
          -
          coalesce((
            select sum((value->>'quantity')::integer)
            from jsonb_array_elements(coalesce(v_order.items_snapshot, '[]'::jsonb))
            where value->>'product_id' = v_product.id::text
              and coalesce(value->>'variant_key', value->'variant'->>'key', '') = v_variant_key
          ), 0)
        into v_variant_delta;

        if v_variant_delta <> 0 and jsonb_typeof(v_variant->'stock') = 'number' then
          v_variant_stock := greatest(coalesce((v_variant->>'stock')::integer, 0), 0);
          v_next_variant_stock := v_variant_stock - v_variant_delta;

          if v_next_variant_stock < 0 then
            raise exception 'INSUFFICIENT_VARIANT_STOCK';
          end if;

          select coalesce(jsonb_agg(
            case
              when coalesce(candidate->>'key', candidate->>'id', '') = v_variant_key
                then jsonb_set(candidate, '{stock}', to_jsonb(v_next_variant_stock), true)
              else candidate
            end
          ), '[]'::jsonb)
          into v_variants_next
          from jsonb_array_elements(v_variants_next) as candidate;
        end if;
      end loop;
    end if;

    update public.products
    set stock = v_next_stock,
        variants_json = v_variants_next,
        is_active = case
          when v_next_stock <= 0 then false
          when coalesce(v_product.stock, 0) <= 0 then true
          else v_product.is_active
        end,
        updated_at = v_now
    where id = v_product.id;
  end loop;

  v_total := round(v_subtotal + coalesce(v_order.shipping_fee, 0) - coalesce(v_order.discount, 0), 2);

  update public.orders as target
  set items_snapshot = v_new_items,
      subtotal = v_subtotal,
      total = v_total,
      pricing_version = target.pricing_version + 1,
      pricing_updated_at = v_now,
      pricing_updated_by = v_admin_email,
      updated_at = v_now
  where target.id = p_order_id;

  delete from public.order_items as existing_item where existing_item.order_id = p_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    name,
    price,
    quantity,
    image,
    variant_snapshot
  )
  select
    p_order_id,
    nullif(item->>'product_id', '')::uuid,
    coalesce(nullif(item->>'name', ''), 'Product'),
    coalesce((item->>'price')::numeric, 0),
    coalesce((item->>'quantity')::integer, 0),
    nullif(item->>'image', ''),
    coalesce(item->'variant', '{}'::jsonb)
  from jsonb_array_elements(v_new_items) as item;

  update public.invoices as invoice
  set items_snapshot = v_new_items,
      subtotal = v_subtotal,
      shipping_fee = coalesce(v_order.shipping_fee, 0),
      discount = coalesce(v_order.discount, 0),
      total = v_total
  where invoice.order_id = p_order_id;

  insert into public.admin_audit_logs (
    admin_email,
    action,
    entity,
    entity_id,
    payload,
    created_at
  ) values (
    v_admin_email,
    'order_items_updated',
    'order',
    p_order_id,
    jsonb_build_object(
      'before', jsonb_build_object(
        'items', v_order.items_snapshot,
        'subtotal', v_order.subtotal,
        'total', v_order.total,
        'pricing_version', v_order.pricing_version
      ),
      'after', jsonb_build_object(
        'items', v_new_items,
        'subtotal', v_subtotal,
        'total', v_total,
        'pricing_version', v_order.pricing_version + 1
      )
    ),
    v_now
  );

  return query
  select
    current_order.id,
    current_order.subtotal,
    current_order.shipping_fee,
    current_order.discount,
    current_order.total,
    current_order.pricing_version,
    current_order.pricing_updated_at,
    current_order.pricing_updated_by,
    current_order.items_snapshot
  from public.orders as current_order
  where current_order.id = p_order_id;
end;
$$;

revoke execute on function public.update_order_items_atomic(
  uuid, jsonb, text, integer
) from public, anon, authenticated;

grant execute on function public.update_order_items_atomic(
  uuid, jsonb, text, integer
) to service_role;
