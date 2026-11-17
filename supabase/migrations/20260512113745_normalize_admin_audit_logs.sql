alter table if exists public.admin_audit_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_audit_logs'
      and column_name = 'payload'
  ) then
    update public.admin_audit_logs
    set metadata = payload
    where metadata = '{}'::jsonb
      and payload is not null;
  end if;
end $$;

create index if not exists idx_admin_audit_logs_action_created_at
  on public.admin_audit_logs(action, created_at desc);;
