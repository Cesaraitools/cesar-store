create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  hash text not null unique,
  storage_path text not null unique,
  public_url text not null,
  mime_type text not null,
  byte_size bigint not null default 0,
  original_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists media_assets_created_at_idx
  on public.media_assets (created_at desc);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  rows_total integer not null default 0 check (rows_total >= 0),
  rows_processed integer not null default 0 check (rows_processed >= 0),
  rows_success integer not null default 0 check (rows_success >= 0),
  rows_failed integer not null default 0 check (rows_failed >= 0),
  rows_skipped integer not null default 0 check (rows_skipped >= 0),
  next_index integer not null default 0 check (next_index >= 0),
  rows_json jsonb not null default '[]'::jsonb,
  known_product_keys_json jsonb not null default '[]'::jsonb,
  image_cache_json jsonb not null default '{}'::jsonb,
  failures_json jsonb not null default '[]'::jsonb,
  last_error text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists import_jobs_status_created_at_idx
  on public.import_jobs (status, created_at desc);
