-- Add status column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add index for performance when querying by status
CREATE INDEX idx_conversations_status ON public.conversations(status);

-- Add ended_at timestamp for conversation endings
ALTER TABLE public.conversations 
ADD COLUMN ended_at timestamp with time zone;