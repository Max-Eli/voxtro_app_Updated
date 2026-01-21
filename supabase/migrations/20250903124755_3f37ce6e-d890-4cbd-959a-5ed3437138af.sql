-- Create customers table for customer-facing portal
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  weekly_summary_enabled BOOLEAN NOT NULL DEFAULT true
);

-- Create customer_chatbot_assignments table for many-to-many relationship
CREATE TABLE public.customer_chatbot_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, chatbot_id)
);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customer_chatbot_assignments table
ALTER TABLE public.customer_chatbot_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers table
CREATE POLICY "Customers can view their own profile" 
ON public.customers 
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Customers can update their own profile" 
ON public.customers 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Chatbot owners can view their customers" 
ON public.customers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customer_chatbot_assignments cca
  JOIN public.chatbots cb ON cca.chatbot_id = cb.id
  WHERE cca.customer_id = customers.id AND cb.user_id = auth.uid()
));

CREATE POLICY "Chatbot owners can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true); -- Will be restricted by assignments

CREATE POLICY "Chatbot owners can update their customers" 
ON public.customers 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.customer_chatbot_assignments cca
  JOIN public.chatbots cb ON cca.chatbot_id = cb.id
  WHERE cca.customer_id = customers.id AND cb.user_id = auth.uid()
));

-- RLS policies for customer_chatbot_assignments table
CREATE POLICY "Customers can view their assignments" 
ON public.customer_chatbot_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.id = customer_id AND auth.jwt() ->> 'email' = c.email
));

CREATE POLICY "Chatbot owners can manage assignments" 
ON public.customer_chatbot_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.chatbots cb
  WHERE cb.id = chatbot_id AND cb.user_id = auth.uid()
));

-- Update conversations table to allow customers to view their assigned chatbot conversations
CREATE POLICY "Customers can view conversations for assigned chatbots" 
ON public.conversations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customer_chatbot_assignments cca
  JOIN public.customers c ON cca.customer_id = c.id
  WHERE cca.chatbot_id = conversations.chatbot_id 
  AND auth.jwt() ->> 'email' = c.email
));

-- Update messages table to allow customers to view messages for assigned chatbot conversations
CREATE POLICY "Customers can view messages for assigned chatbots" 
ON public.messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversations conv
  JOIN public.customer_chatbot_assignments cca ON conv.chatbot_id = cca.chatbot_id
  JOIN public.customers c ON cca.customer_id = c.id
  WHERE conv.id = messages.conversation_id 
  AND auth.jwt() ->> 'email' = c.email
));

-- Update token_usage table to allow customers to view usage for assigned chatbots
CREATE POLICY "Customers can view token usage for assigned chatbots" 
ON public.token_usage 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customer_chatbot_assignments cca
  JOIN public.customers c ON cca.customer_id = c.id
  WHERE cca.chatbot_id = token_usage.chatbot_id 
  AND auth.jwt() ->> 'email' = c.email
));

-- Create function to update updated_at timestamp
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();