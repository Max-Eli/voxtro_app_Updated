-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule weekly summary emails every Friday at 12:00 PM EST (17:00 UTC)
SELECT cron.schedule(
  'send-weekly-summary-friday',
  '0 17 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://atmwldssfrbmcluvmelm.supabase.co/functions/v1/send-weekly-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bXdsZHNzZnJibWNsdXZtZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODI3MTQsImV4cCI6MjA2ODE1ODcxNH0.XDRMNQKJVHPegWtLlT9qYcpuNxrllyv2NuMGpek4J1k"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);