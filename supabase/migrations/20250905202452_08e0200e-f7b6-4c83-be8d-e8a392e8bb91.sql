-- Create a proper security definer function to get current customer
-- This avoids the user_metadata security issue

CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS UUID AS $$
  SELECT c.id 
  FROM public.customers c
  WHERE c.email = auth.email()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Now create a proper RLS policy using this function
DROP POLICY IF EXISTS "Customers can view their assignments" ON public.customer_chatbot_assignments;

CREATE POLICY "Customers can view their assignments" 
ON public.customer_chatbot_assignments 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND 
  customer_id = public.get_current_customer_id()
);