-- Create voice_connections table to store API credentials
CREATE TABLE public.voice_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create voice_assistants table to cache assistant data
CREATE TABLE public.voice_assistants (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  first_message TEXT,
  voice_provider TEXT,
  voice_id TEXT,
  model_provider TEXT,
  model TEXT,
  transcriber_provider TEXT,
  org_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_assistant_assignments table
CREATE TABLE public.customer_assistant_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assistant_id TEXT NOT NULL REFERENCES public.voice_assistants(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, assistant_id)
);

-- Enable RLS
ALTER TABLE public.voice_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_assistant_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_connections
CREATE POLICY "Users can view their own voice connection"
  ON public.voice_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice connection"
  ON public.voice_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice connection"
  ON public.voice_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice connection"
  ON public.voice_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for voice_assistants
CREATE POLICY "Users can view their own assistants"
  ON public.voice_assistants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assistants"
  ON public.voice_assistants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistants"
  ON public.voice_assistants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistants"
  ON public.voice_assistants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for customer_assistant_assignments
CREATE POLICY "Users can view assignments they created"
  ON public.customer_assistant_assignments FOR SELECT
  USING (auth.uid() = assigned_by);

CREATE POLICY "Customers can view their own assignments"
  ON public.customer_assistant_assignments FOR SELECT
  USING (customer_id = get_current_customer_id());

CREATE POLICY "Users can create assignments"
  ON public.customer_assistant_assignments FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can delete assignments they created"
  ON public.customer_assistant_assignments FOR DELETE
  USING (auth.uid() = assigned_by);

-- Triggers for updated_at
CREATE TRIGGER update_voice_connections_updated_at
  BEFORE UPDATE ON public.voice_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_assistants_updated_at
  BEFORE UPDATE ON public.voice_assistants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_voice_assistants_user_id ON public.voice_assistants(user_id);
CREATE INDEX idx_customer_assistant_assignments_customer_id ON public.customer_assistant_assignments(customer_id);
CREATE INDEX idx_customer_assistant_assignments_assistant_id ON public.customer_assistant_assignments(assistant_id);