create table if not exists public.store_maintenance_settings (
  id text primary key default 'default',
  enabled boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint store_maintenance_settings_singleton check (id = 'default'),
  constraint store_maintenance_settings_valid_window check (
    enabled = false
    or (
      starts_at is not null
      and ends_at is not null
      and ends_at > starts_at
    )
  )
);

insert into public.store_maintenance_settings (id, enabled)
values ('default', false)
on conflict (id) do nothing;

alter table public.store_maintenance_settings enable row level security;

revoke all on table public.store_maintenance_settings from anon, authenticated;
grant select, insert, update on table public.store_maintenance_settings to service_role;

create policy "store_maintenance_settings_internal_only"
  on public.store_maintenance_settings
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.store_maintenance_settings is
  'Server-only singleton schedule for the temporary Cesar Store maintenance mode.';
