alter table public.promos
  add column if not exists image_url text;

alter table public.promos
  add column if not exists images_json jsonb not null default '[]'::jsonb;

update public.promos
set images_json =
  case
    when coalesce(jsonb_array_length(images_json), 0) > 0 then images_json
    when image_url is not null and image_url <> '' then jsonb_build_array(image_url)
    else '[]'::jsonb
  end
where true;
