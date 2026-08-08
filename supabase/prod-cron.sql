-- PRODUCTION ONLY: schedule the matching + housekeeping crons with pg_cron
-- + pg_net. Run this once against your hosted project (SQL editor), after
-- replacing <PROJECT_REF> and setting the cron secret.
--
-- Locally we skip this and trigger functions manually:
--   npm run trigger:match / npm run trigger:expire

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the secret once (must match the CRON_SECRET function secret):
--   select vault.create_secret('<random-long-secret>', 'cron_secret');

-- Daily match at 10:00 IST (04:30 UTC)
select cron.schedule(
  'meetcute-daily-match',
  '30 4 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Expiry sweep every 15 minutes
select cron.schedule(
  'meetcute-expire-matches',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
