alter table if exists public.order_items
  add column if not exists image text;

insert into public.order_items (
  order_id,
  product_id,
  name,
  price,
  quantity,
  image
)
select
  orders.id,
  nullif(item.value->>'product_id', '')::uuid,
  coalesce(
    nullif(item.value->>'name', ''),
    nullif(item.value->>'name_ar', ''),
    nullif(item.value->>'name_en', ''),
    'Product'
  ),
  case
    when coalesce(item.value->>'price', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      then (item.value->>'price')::numeric
    else 0
  end,
  greatest(
    case
      when coalesce(item.value->>'quantity', '') ~ '^[0-9]+$'
        then (item.value->>'quantity')::integer
      else 0
    end,
    1
  ),
  nullif(item.value->>'image', '')
from public.orders
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(orders.items_snapshot) = 'array'
      then orders.items_snapshot
    else '[]'::jsonb
  end
) as item(value)
where not exists (
  select 1
  from public.order_items
  where order_items.order_id = orders.id
);;
