-- Create leads table to store extracted lead data from all agent types
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('chatbot', 'voice', 'whatsapp')),
  source_id TEXT NOT NULL,
  source_name TEXT,
  conversation_id TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  name TEXT,
  additional_data JSONB DEFAULT '{}',
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  UNIQUE(source_type, conversation_id)
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_leads_source_type ON public.leads(source_type);
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_extracted_at ON public.leads(extracted_at DESC);

-- RLS policies for admins (users who own the agents)
CREATE POLICY "Users can view leads from their agents"
ON public.leads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert leads for their agents"
ON public.leads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update leads for their agents"
ON public.leads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete leads for their agents"
ON public.leads
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to allow service role full access
CREATE POLICY "Service role has full access to leads"
ON public.leads
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();