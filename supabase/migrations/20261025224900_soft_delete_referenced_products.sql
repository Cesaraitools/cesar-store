alter table public.products
  add column if not exists deleted_at timestamp with time zone;

create index if not exists idx_products_deleted_at
  on public.products (deleted_at);
