-- Keep the publisher completely server-only while making the deny posture explicit.

create policy "social_publisher_settings_internal_only"
  on public.social_publisher_settings
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "social_post_queue_internal_only"
  on public.social_post_queue
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "social_publication_events_internal_only"
  on public.social_publication_events
  for all
  to anon, authenticated
  using (false)
  with check (false);
