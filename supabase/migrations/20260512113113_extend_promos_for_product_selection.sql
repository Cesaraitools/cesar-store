alter table public.promos
  add column if not exists product_ids_json jsonb not null default '[]'::jsonb;

update public.promos
set product_ids_json =
  case
    when coalesce(jsonb_array_length(product_ids_json), 0) > 0 then product_ids_json
    when product_id is not null and product_id <> '' then jsonb_build_array(product_id)
    else '[]'::jsonb
  end
where true;
