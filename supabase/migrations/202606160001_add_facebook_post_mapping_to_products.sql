alter table if exists public.products
  add column if not exists facebook_post_id text,
  add column if not exists facebook_post_permalink_url text;

create index if not exists idx_products_facebook_post_id
  on public.products(facebook_post_id);
