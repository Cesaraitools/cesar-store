update public.import_jobs
set
  status = 'failed',
  last_error = coalesce(
    last_error,
    'Import job expired after being left in processing state.'
  ),
  finished_at = coalesce(finished_at, now()),
  updated_at = now()
where status = 'processing'
  and updated_at < now() - interval '15 minutes';

create index if not exists idx_import_jobs_status_updated_at
  on public.import_jobs(status, updated_at);;
