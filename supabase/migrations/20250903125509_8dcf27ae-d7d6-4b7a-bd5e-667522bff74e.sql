-- Drop existing problematic policies
DROP POLICY IF EXISTS "Chatbot owners can view their customers" ON public.customers;
DROP POLICY IF EXISTS "Chatbot owners can update their customers" ON public.customers;
DROP POLICY IF EXISTS "Chatbot owners can manage assignments" ON public.customer_chatbot_assignments;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_owns_chatbot(chatbot_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chatbots
    WHERE id = chatbot_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_has_user_chatbot(customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_chatbot_assignments cca
    JOIN public.chatbots cb ON cca.chatbot_id = cb.id
    WHERE cca.customer_id = customer_has_user_chatbot.customer_id 
    AND cb.user_id = auth.uid()
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Chatbot owners can view their customers" 
ON public.customers 
FOR SELECT 
USING (public.customer_has_user_chatbot(id));

CREATE POLICY "Chatbot owners can update their customers" 
ON public.customers 
FOR UPDATE 
USING (public.customer_has_user_chatbot(id));

CREATE POLICY "Chatbot owners can manage assignments" 
ON public.customer_chatbot_assignments 
FOR ALL 
USING (public.user_owns_chatbot(chatbot_id));