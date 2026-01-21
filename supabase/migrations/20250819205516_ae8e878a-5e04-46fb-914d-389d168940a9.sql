-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to detect conversation ends every 5 minutes
SELECT cron.schedule(
  'detect-conversation-ends',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://atmwldssfrbmcluvmelm.supabase.co/functions/v1/detect-conversation-end',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bXdsZHNzZnJibWNsdXZtZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODI3MTQsImV4cCI6MjA2ODE1ODcxNH0.XDRMNQKJVHPegWtLlT9qYcpuNxrllyv2NuMGpek4J1k"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);