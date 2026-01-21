-- Remove any existing cron job with this name first
SELECT cron.unschedule('extract-leads-cron-job') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'extract-leads-cron-job');

-- Schedule lead extraction to run every 5 minutes
SELECT cron.schedule(
  'extract-leads-cron-job',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://atmwldssfrbmcluvmelm.supabase.co/functions/v1/extract-leads-cron',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bXdsZHNzZnJibWNsdXZtZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODI3MTQsImV4cCI6MjA2ODE1ODcxNH0.XDRMNQKJVHPegWtLlT9qYcpuNxrllyv2NuMGpek4J1k"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);