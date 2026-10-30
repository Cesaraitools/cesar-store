-- Cesar Social Publisher
-- Internal-only scheduling, queue, and immutable audit history.

create table public.social_publisher_settings (
  id text primary key default 'default',
  enabled boolean not null default false,
  mode text not null default 'draft',
  facebook_enabled boolean not null default true,
  instagram_enabled boolean not null default true,
  auto_queue_enabled boolean not null default true,
  min_stock integer not null default 1,
  repeat_cooldown_days integer not null default 45,
  daily_post_limit integer not null default 1,
  posting_times jsonb not null default '["12:00"]'::jsonb,
  timezone text not null default 'Africa/Cairo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_publisher_settings_singleton check (id = 'default'),
  constraint social_publisher_settings_mode check (mode in ('draft', 'live')),
  constraint social_publisher_settings_min_stock check (min_stock >= 0),
  constraint social_publisher_settings_cooldown check (
    repeat_cooldown_days between 1 and 365
  ),
  constraint social_publisher_settings_daily_limit check (
    daily_post_limit between 1 and 10
  ),
  constraint social_publisher_settings_posting_times check (
    jsonb_typeof(posting_times) = 'array'
  )
);

insert into public.social_publisher_settings (id)
values ('default')
on conflict (id) do nothing;

create table public.social_post_queue (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  platform text not null,
  status text not null default 'draft',
  scheduled_for timestamptz not null,
  caption text not null,
  product_name text not null,
  price_snapshot numeric(12, 2) not null,
  stock_snapshot integer not null,
  image_url text not null,
  product_url text not null,
  idempotency_key text not null unique,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  external_post_id text,
  external_post_url text,
  published_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_post_queue_platform check (
    platform in ('facebook', 'instagram')
  ),
  constraint social_post_queue_status check (
    status in (
      'draft',
      'queued',
      'processing',
      'published',
      'failed',
      'cancelled',
      'skipped'
    )
  ),
  constraint social_post_queue_attempt_count check (attempt_count >= 0),
  constraint social_post_queue_max_attempts check (max_attempts between 1 and 10),
  constraint social_post_queue_price_snapshot check (price_snapshot >= 0),
  constraint social_post_queue_stock_snapshot check (stock_snapshot >= 0)
);

create unique index social_post_queue_one_active_product_platform
  on public.social_post_queue(product_id, platform)
  where status in ('draft', 'queued', 'processing');

create index social_post_queue_due_idx
  on public.social_post_queue(status, scheduled_for, created_at);

create index social_post_queue_product_history_idx
  on public.social_post_queue(product_id, platform, published_at desc);

create table public.social_publication_events (
  id bigint generated always as identity primary key,
  queue_id uuid references public.social_post_queue(id) on delete set null,
  event_type text not null,
  platform text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint social_publication_events_platform check (
    platform is null or platform in ('facebook', 'instagram')
  )
);

create index social_publication_events_queue_idx
  on public.social_publication_events(queue_id, created_at desc);

alter table public.social_publisher_settings enable row level security;
alter table public.social_post_queue enable row level security;
alter table public.social_publication_events enable row level security;

revoke all on table public.social_publisher_settings from anon, authenticated;
revoke all on table public.social_post_queue from anon, authenticated;
revoke all on table public.social_publication_events from anon, authenticated;
revoke all on sequence public.social_publication_events_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.social_publisher_settings to service_role;
grant select, insert, update, delete on table public.social_post_queue to service_role;
grant select, insert on table public.social_publication_events to service_role;
grant usage, select on sequence public.social_publication_events_id_seq to service_role;

create or replace function public.claim_due_social_post(p_worker_id text)
returns setof public.social_post_queue
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select q.id
    from public.social_post_queue as q
    where q.status = 'queued'
      and q.scheduled_for <= now()
      and q.attempt_count < q.max_attempts
      and (q.locked_at is null or q.locked_at < now() - interval '15 minutes')
    order by q.scheduled_for asc, q.created_at asc
    for update skip locked
    limit 1
  )
  update public.social_post_queue as queue
  set
    status = 'processing',
    attempt_count = queue.attempt_count + 1,
    locked_at = now(),
    locked_by = nullif(trim(p_worker_id), ''),
    last_error = null,
    updated_at = now()
  from candidate
  where queue.id = candidate.id
  returning queue.*;
end;
$$;

revoke all on function public.claim_due_social_post(text) from public, anon, authenticated;
grant execute on function public.claim_due_social_post(text) to service_role;

comment on table public.social_publisher_settings is
  'Server-only settings for the Cesar automated social publisher.';
comment on table public.social_post_queue is
  'Server-only, idempotent Facebook and Instagram publication queue.';
comment on table public.social_publication_events is
  'Immutable operational audit history for social publishing.';
