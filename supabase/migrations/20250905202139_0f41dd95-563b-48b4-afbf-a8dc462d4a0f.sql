-- Debug and fix the customer chatbot assignments RLS policy
-- The issue is likely with the complex EXISTS subquery

-- Drop the existing policy
DROP POLICY IF EXISTS "Customers can view their assignments" ON public.customer_chatbot_assignments;

-- Create a simpler, more direct policy using the customer_id directly
CREATE POLICY "Customers can view their assignments" 
ON public.customer_chatbot_assignments 
FOR SELECT 
USING (
  ((auth.jwt() ->> 'is_customer')::boolean = true) 
  AND 
  customer_id IN (
    SELECT id FROM public.customers 
    WHERE email = (auth.jwt() ->> 'customer_email')
  )
);