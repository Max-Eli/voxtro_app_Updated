-- Fix RLS policy for customer creation
DROP POLICY IF EXISTS "Allow all customer creation" ON public.customers;

-- Create a proper policy for customer creation that allows authenticated users to create customers
CREATE POLICY "Authenticated users can create customers" ON public.customers
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also ensure chatbot owners can delete their customers
DROP POLICY IF EXISTS "Chatbot owners can delete their customers" ON public.customers;
CREATE POLICY "Chatbot owners can delete their customers" ON public.customers
FOR DELETE 
TO authenticated
USING (customer_has_user_chatbot(id));