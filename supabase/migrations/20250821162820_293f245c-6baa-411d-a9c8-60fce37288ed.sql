-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Check if the cron job exists and update it to use the correct service role key
SELECT cron.unschedule('detect-conversation-ends');

-- Schedule the cron job to run every 5 minutes
SELECT cron.schedule(
  'detect-conversation-ends',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://atmwldssfrbmcluvmelm.supabase.co/functions/v1/detect-conversation-end',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);