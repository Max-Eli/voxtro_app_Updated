-- Create customer_whatsapp_agent_assignments table for assigning agents to customers
CREATE TABLE public.customer_whatsapp_agent_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, agent_id)
);

-- Enable RLS
ALTER TABLE public.customer_whatsapp_agent_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for customer_whatsapp_agent_assignments
CREATE POLICY "Users can view their own assignments"
ON public.customer_whatsapp_agent_assignments
FOR SELECT
USING (assigned_by = auth.uid());

CREATE POLICY "Users can create assignments for their agents"
ON public.customer_whatsapp_agent_assignments
FOR INSERT
WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Users can delete their own assignments"
ON public.customer_whatsapp_agent_assignments
FOR DELETE
USING (assigned_by = auth.uid());

CREATE POLICY "Customers can view their agent assignments"
ON public.customer_whatsapp_agent_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_whatsapp_agent_assignments.customer_id
    AND c.email = auth.email()
  )
);

-- Create whatsapp_conversations table for storing conversation threads
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  sentiment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_conversations
CREATE POLICY "Users can view conversations for their agents"
ON public.whatsapp_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_agents wa
    WHERE wa.id = whatsapp_conversations.agent_id
    AND wa.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert conversations for their agents"
ON public.whatsapp_conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_agents wa
    WHERE wa.id = whatsapp_conversations.agent_id
    AND wa.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (
  customer_id = get_current_customer_id()
  OR
  EXISTS (
    SELECT 1
    FROM public.customer_whatsapp_agent_assignments cwaa
    JOIN public.customers c ON c.id = cwaa.customer_id
    WHERE cwaa.agent_id = whatsapp_conversations.agent_id
    AND c.email = auth.email()
  )
);

-- Create whatsapp_messages table for storing individual messages
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_messages
CREATE POLICY "Users can view messages for their agent conversations"
ON public.whatsapp_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_agents wa ON wa.id = wc.agent_id
    WHERE wc.id = whatsapp_messages.conversation_id
    AND wa.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view messages for their conversations"
ON public.whatsapp_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.customer_whatsapp_agent_assignments cwaa ON cwaa.agent_id = wc.agent_id
    JOIN public.customers c ON c.id = cwaa.customer_id
    WHERE wc.id = whatsapp_messages.conversation_id
    AND c.email = auth.email()
  )
);

-- Add updated_at trigger to conversations
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_whatsapp_conversations_agent_id ON public.whatsapp_conversations(agent_id);
CREATE INDEX idx_whatsapp_conversations_customer_id ON public.whatsapp_conversations(customer_id);
CREATE INDEX idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_customer_whatsapp_agent_assignments_customer_id ON public.customer_whatsapp_agent_assignments(customer_id);
CREATE INDEX idx_customer_whatsapp_agent_assignments_agent_id ON public.customer_whatsapp_agent_assignments(agent_id);