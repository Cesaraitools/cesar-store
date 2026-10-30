-- Run the Vercel-hosted publisher worker every 15 minutes without depending
-- on Vercel Pro Cron. The bearer secret is read from Supabase Vault at run
-- time and is never stored in this migration or in cron.job.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cesar-social-publisher-worker',
  '*/15 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.cesareshop.com/api/cron/social-publisher',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || coalesce(
          (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'cesar_social_publisher_cron_secret'
            limit 1
          ),
          ''
        )
      ),
      timeout_milliseconds := 30000
    ) as request_id;
  $job$
);
