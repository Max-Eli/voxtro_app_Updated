-- Create response cache table for optimization
CREATE TABLE public.response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Create index for fast lookups
CREATE INDEX idx_response_cache_chatbot_hash ON public.response_cache(chatbot_id, question_hash);
CREATE INDEX idx_response_cache_expires ON public.response_cache(expires_at);

-- Enable RLS
ALTER TABLE public.response_cache ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view cache for their chatbots" 
ON public.response_cache 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chatbots 
    WHERE chatbots.id = response_cache.chatbot_id 
    AND chatbots.user_id = auth.uid()
  )
);

CREATE POLICY "System can create cache entries" 
ON public.response_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update cache entries" 
ON public.response_cache 
FOR UPDATE 
USING (true);

CREATE POLICY "System can delete expired cache entries" 
ON public.response_cache 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_response_cache_updated_at
BEFORE UPDATE ON public.response_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create token usage tracking table
CREATE TABLE public.token_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for analytics
CREATE INDEX idx_token_usage_chatbot_date ON public.token_usage(chatbot_id, created_at);
CREATE INDEX idx_token_usage_conversation ON public.token_usage(conversation_id);

-- Enable RLS
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for token usage
CREATE POLICY "Users can view token usage for their chatbots" 
ON public.token_usage 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chatbots 
    WHERE chatbots.id = token_usage.chatbot_id 
    AND chatbots.user_id = auth.uid()
  )
);

CREATE POLICY "System can create token usage records" 
ON public.token_usage 
FOR INSERT 
WITH CHECK (true);

-- Add token limit fields to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN daily_token_limit INTEGER DEFAULT 100000,
ADD COLUMN monthly_token_limit INTEGER DEFAULT 1000000,
ADD COLUMN cache_enabled BOOLEAN DEFAULT true,
ADD COLUMN cache_duration_hours INTEGER DEFAULT 168; -- 7 days