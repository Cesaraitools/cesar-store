-- Permanently remove cancelled publisher queue rows and their attempt history.
-- Successful publications are intentionally excluded from this cleanup.

grant delete on table public.social_publication_events to service_role;

create or replace function public.delete_cancelled_social_post(p_queue_id uuid)
returns setof public.social_post_queue
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_queue public.social_post_queue;
begin
  select queue.*
  into v_queue
  from public.social_post_queue as queue
  where queue.id = p_queue_id
  for update;

  if not found then
    raise exception 'Queue item not found.';
  end if;

  if v_queue.status not in ('draft', 'queued', 'failed') then
    raise exception 'Only draft, queued, or failed posts can be cancelled.';
  end if;

  delete from public.social_publication_events
  where queue_id = p_queue_id;

  delete from public.social_post_queue
  where id = p_queue_id;

  return next v_queue;
end;
$$;

revoke all on function public.delete_cancelled_social_post(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_cancelled_social_post(uuid)
  to service_role;

-- Remove historical cancelled entries that predate hard-delete cancellation.
delete from public.social_publication_events as event
using public.social_post_queue as queue
where event.queue_id = queue.id
  and queue.status = 'cancelled';

delete from public.social_post_queue
where status = 'cancelled';
