-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the sync-whatsapp-conversations function to run every 5 minutes
SELECT cron.schedule(
  'sync-whatsapp-conversations-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://atmwldssfrbmcluvmelm.supabase.co/functions/v1/sync-whatsapp-conversations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bXdsZHNzZnJibWNsdXZtZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODI3MTQsImV4cCI6MjA2ODE1ODcxNH0.XDRMNQKJVHPegWtLlT9qYcpuNxrllyv2NuMGpek4J1k"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);