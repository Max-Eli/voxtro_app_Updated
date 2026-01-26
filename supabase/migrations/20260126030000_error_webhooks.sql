-- Create error_logs table to track all errors (admin only)
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    error_type VARCHAR(50) NOT NULL, -- 'edge_function', 'api', 'frontend', 'webhook', 'email'
    error_source VARCHAR(100), -- function name or component
    error_message TEXT NOT NULL,
    error_stack TEXT,
    metadata JSONB,
    severity VARCHAR(20) DEFAULT 'error', -- 'error', 'warning', 'critical'
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- Enable RLS but allow service role to insert
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (errors can come from anywhere)
CREATE POLICY "Allow insert for all"
    ON public.error_logs FOR INSERT
    WITH CHECK (true);

-- No select policy - only viewable via Supabase dashboard or service role
