create sequence if not exists public.wholesale_order_returns_return_number_seq;

create table if not exists public.wholesale_order_returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique default (
    'WR' || lpad(nextval('public.wholesale_order_returns_return_number_seq'::regclass)::text, 6, '0')
  ),
  order_id uuid not null references public.wholesale_orders(id) on delete restrict,
  order_item_id uuid not null references public.wholesale_order_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  returned_units integer not null check (returned_units > 0),
  reason text not null default '',
  note text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wholesale_order_returns_order_id
  on public.wholesale_order_returns(order_id);

create index if not exists idx_wholesale_order_returns_order_item_id
  on public.wholesale_order_returns(order_item_id);

create index if not exists idx_wholesale_order_returns_product_id
  on public.wholesale_order_returns(product_id);

alter table public.wholesale_order_returns enable row level security;

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
    is_active = true
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
