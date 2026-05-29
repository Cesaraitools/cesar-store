create extension if not exists pgcrypto;

create sequence if not exists public.orders_order_number_seq;

alter table if exists public.products
  add column if not exists variant_options_json jsonb not null default '[]'::jsonb,
  add column if not exists variants_json jsonb not null default '[]'::jsonb;

alter table if exists public.orders
  alter column id set default gen_random_uuid();

alter table if exists public.orders
  alter column order_number set default nextval('public.orders_order_number_seq'::regclass)::text;

alter table if exists public.orders
  add column if not exists status text not null default 'requested',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists confirmed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists snapshot jsonb,
  add column if not exists order_token text,
  add column if not exists archived_at timestamptz;

create index if not exists idx_orders_updated_at
  on public.orders(updated_at);

create index if not exists idx_orders_archived_at
  on public.orders(archived_at);

create index if not exists idx_orders_order_token
  on public.orders(order_token);

create unique index if not exists idx_orders_user_order_token
  on public.orders(user_id, order_token)
  where order_token is not null;

alter table if exists public.cart_items
  add column if not exists variant_key text not null default '',
  add column if not exists variant_snapshot jsonb not null default '{}'::jsonb;

alter table if exists public.order_items
  add column if not exists image text,
  add column if not exists variant_snapshot jsonb not null default '{}'::jsonb;

alter table if exists public.cart_items
  drop constraint if exists cart_items_unique_product_per_cart;

drop index if exists public.idx_cart_items_one_product_per_cart;
drop index if exists public.cart_items_unique_product_per_cart;
drop index if exists public.uniq_cart_product;

create unique index if not exists idx_cart_items_one_product_variant_per_cart
  on public.cart_items(cart_id, product_id, variant_key);

drop function if exists public.create_order_atomic(uuid, jsonb, jsonb, text, text);

create or replace function public.create_order_atomic(
  p_user_id uuid,
  p_items jsonb,
  p_customer jsonb,
  p_currency text,
  p_order_token text
)
returns table (
  order_id uuid,
  order_number text,
  reused boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_order public.orders%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_order_number text := nextval('public.orders_order_number_seq')::text;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_price numeric;
  v_name_ar text;
  v_name_en text;
  v_image text;
  v_variant_key text;
  v_variant_snapshot jsonb;
  v_variant_record jsonb;
  v_variants_next jsonb;
  v_variant_stock integer;
  v_variant_uses_shared_stock boolean;
  v_product_record record;
  v_order_item_name text;
  v_active_cart_ids uuid[] := '{}'::uuid[];
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_order_token is null or btrim(p_order_token) = '' then
    raise exception 'p_order_token is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items must be a non-empty array';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_order_token));

  select coalesce(array_agg(locked_carts.id), '{}'::uuid[])
  into v_active_cart_ids
  from (
    select id
    from public.carts
    where user_id = p_user_id
      and status = 'active'
    order by created_at asc, id asc
    for update
  ) as locked_carts;

  select *
  into v_existing_order
  from public.orders
  where user_id = p_user_id
    and order_token = p_order_token
  limit 1;

  if found then
    if cardinality(v_active_cart_ids) > 0 then
      delete from public.cart_items
      where cart_id = any(v_active_cart_ids);

      update public.carts
      set
        status = 'ordered',
        updated_at = now()
      where id = any(v_active_cart_ids);
    end if;

    return query
    select v_existing_order.id, v_existing_order.order_number, true;
    return;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := greatest(coalesce((v_item->>'quantity')::integer, 0), 0);
    v_price := coalesce((v_item->>'price')::numeric, 0);
    v_name_ar := coalesce(v_item->>'name_ar', '');
    v_name_en := coalesce(v_item->>'name_en', '');
    v_image := nullif(v_item->>'image', '');
    v_variant_key := coalesce(v_item->>'variant_key', '');
    v_variant_snapshot := coalesce(v_item->'variant', v_item->'variant_snapshot', '{}'::jsonb);
    v_variant_record := null;
    v_variants_next := null;
    v_variant_stock := null;
    v_variant_uses_shared_stock := false;

    if v_product_id is null or v_quantity <= 0 then
      raise exception 'Invalid order item payload';
    end if;

    select id, name_ar, name_en, stock, is_active, variants_json
    into v_product_record
    from public.products
    where id = v_product_id
      and is_active = true
    for update;

    if not found then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    if jsonb_typeof(coalesce(v_product_record.variants_json, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(v_product_record.variants_json, '[]'::jsonb)) > 0
    then
      if v_variant_key = '' then
        raise exception 'Insufficient stock for product %', v_product_id;
      end if;

      select variant
      into v_variant_record
      from jsonb_array_elements(v_product_record.variants_json) as variant
      where coalesce(variant->>'key', variant->>'id', '') = v_variant_key
        and coalesce((variant->>'active')::boolean, true) = true
      limit 1;

      if v_variant_record is null then
        raise exception 'Insufficient stock for product %', v_product_id;
      end if;

      v_variant_stock := coalesce((v_variant_record->>'stock')::integer, 0);
      v_variant_uses_shared_stock := v_variant_stock <= 0;

      if (
        case
          when v_variant_uses_shared_stock then coalesce(v_product_record.stock, 0)
          else v_variant_stock
        end
      ) < v_quantity then
        raise exception 'Insufficient stock for product %', v_product_id;
      end if;

      select jsonb_agg(
        case
          when coalesce(variant->>'key', variant->>'id', '') = v_variant_key then
            case
              when v_variant_uses_shared_stock then variant
              else jsonb_set(
                variant,
                '{stock}',
                to_jsonb(greatest(v_variant_stock - v_quantity, 0)),
                true
              )
            end
          else variant
        end
      )
      into v_variants_next
      from jsonb_array_elements(v_product_record.variants_json) as variant;

      update public.products
      set
        stock = greatest(stock - v_quantity, 0),
        variants_json = coalesce(v_variants_next, variants_json),
        is_active = (stock - v_quantity) > 0,
        updated_at = now()
      where id = v_product_id;
    else
      if coalesce(v_product_record.stock, 0) < v_quantity then
        raise exception 'Insufficient stock for product %', v_product_id;
      end if;

      update public.products
      set
        stock = stock - v_quantity,
        is_active = (stock - v_quantity) > 0,
        updated_at = now()
      where id = v_product_id;
    end if;

    v_order_item_name := coalesce(nullif(v_name_ar, ''), nullif(v_name_en, ''), v_product_record.name_ar, v_product_record.name_en, 'Product');

    v_items_snapshot := v_items_snapshot || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id,
        'name_ar', coalesce(v_name_ar, ''),
        'name_en', coalesce(v_name_en, ''),
        'name', v_order_item_name,
        'price', v_price,
        'quantity', v_quantity,
        'image', v_image,
        'variant_key', v_variant_key,
        'variant', v_variant_snapshot
      )
    );

    v_subtotal := v_subtotal + (v_price * v_quantity);
  end loop;

  insert into public.orders (
    id,
    user_id,
    order_number,
    status,
    subtotal,
    shipping_fee,
    discount,
    total,
    currency,
    customer_snapshot,
    items_snapshot,
    created_at,
    updated_at,
    order_token
  )
  values (
    v_order_id,
    p_user_id,
    v_order_number,
    'requested',
    v_subtotal,
    0,
    0,
    v_subtotal,
    coalesce(nullif(p_currency, ''), 'EGP'),
    coalesce(p_customer, '{}'::jsonb),
    v_items_snapshot,
    now(),
    now(),
    p_order_token
  );

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
    v_order_id,
    nullif(item->>'product_id', '')::uuid,
    coalesce(nullif(item->>'name', ''), 'Product'),
    coalesce((item->>'price')::numeric, 0),
    coalesce((item->>'quantity')::integer, 0),
    nullif(item->>'image', ''),
    coalesce(item->'variant', '{}'::jsonb)
  from jsonb_array_elements(v_items_snapshot) as item;

  insert into public.order_tracking_events (
    id,
    order_id,
    status,
    actor,
    note
  )
  values (
    gen_random_uuid(),
    v_order_id,
    'requested',
    'customer',
    'Order created'
  );

  if cardinality(v_active_cart_ids) > 0 then
    delete from public.cart_items
    where cart_id = any(v_active_cart_ids);

    update public.carts
    set
      status = 'ordered',
      updated_at = now()
    where id = any(v_active_cart_ids);
  end if;

  return query
  select v_order_id, v_order_number, false;
exception
  when unique_violation then
    select *
    into v_existing_order
    from public.orders
    where user_id = p_user_id
      and order_token = p_order_token
    limit 1;

    if found then
      if cardinality(v_active_cart_ids) > 0 then
        delete from public.cart_items
        where cart_id = any(v_active_cart_ids);

        update public.carts
        set
          status = 'ordered',
          updated_at = now()
        where id = any(v_active_cart_ids);
      end if;

      return query
      select v_existing_order.id, v_existing_order.order_number, true;
      return;
    end if;

    raise;
end;
$$;

grant execute on function public.create_order_atomic(uuid, jsonb, jsonb, text, text) to authenticated;
grant execute on function public.create_order_atomic(uuid, jsonb, jsonb, text, text) to service_role;
