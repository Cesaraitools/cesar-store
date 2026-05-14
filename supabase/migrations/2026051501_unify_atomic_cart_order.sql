create extension if not exists pgcrypto;

-- Keep one active cart per registered customer before enforcing the rule.
with active_carts as (
  select
    id,
    user_id,
    first_value(id) over (
      partition by user_id
      order by created_at asc, id asc
    ) as primary_cart_id,
    row_number() over (
      partition by user_id
      order by created_at asc, id asc
    ) as rn
  from public.carts
  where user_id is not null
    and status = 'active'
),
moved_items as (
  update public.cart_items ci
  set
    cart_id = ac.primary_cart_id,
    updated_at = now()
  from active_carts ac
  where ac.rn > 1
    and ci.cart_id = ac.id
  returning ci.id
)
update public.carts c
set
  status = 'ordered',
  updated_at = now()
from active_carts ac
where ac.rn > 1
  and c.id = ac.id;

-- Collapse duplicate product rows inside the same cart before adding a uniqueness guard.
with ranked_items as (
  select
    ci.id,
    ci.cart_id,
    ci.product_id,
    sum(greatest(coalesce(ci.quantity, 0), 0)) over (
      partition by ci.cart_id, ci.product_id
    ) as total_quantity,
    row_number() over (
      partition by ci.cart_id, ci.product_id
      order by ci.created_at asc, ci.id asc
    ) as rn
  from public.cart_items ci
),
updated_primary_items as (
  update public.cart_items ci
  set
    quantity = greatest(ri.total_quantity, 1)::integer,
    updated_at = now()
  from ranked_items ri
  where ci.id = ri.id
    and ri.rn = 1
  returning ci.id
)
delete from public.cart_items ci
using ranked_items ri
where ci.id = ri.id
  and ri.rn > 1;

create unique index if not exists idx_carts_one_active_per_user
  on public.carts(user_id)
  where user_id is not null
    and status = 'active';

create unique index if not exists idx_cart_items_one_product_per_cart
  on public.cart_items(cart_id, product_id);

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

    if v_product_id is null or v_quantity <= 0 then
      raise exception 'Invalid order item payload';
    end if;

    update public.products
    set
      stock = stock - v_quantity,
      is_active = (stock - v_quantity) > 0,
      updated_at = now()
    where id = v_product_id
      and is_active = true
      and stock >= v_quantity
    returning id, name_ar, name_en
    into v_product_record;

    if not found then
      raise exception 'Insufficient stock for product %', v_product_id;
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
        'image', v_image
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
    image
  )
  select
    v_order_id,
    nullif(item->>'product_id', '')::uuid,
    coalesce(nullif(item->>'name', ''), 'Product'),
    coalesce((item->>'price')::numeric, 0),
    coalesce((item->>'quantity')::integer, 0),
    nullif(item->>'image', '')
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
