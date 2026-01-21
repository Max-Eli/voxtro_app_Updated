-- Fix the customer chatbot assignments RLS policy
-- The current policy has a complex nested query that might not be working correctly

-- Drop the existing policy
DROP POLICY IF EXISTS "Customers can view their assignments" ON public.customer_chatbot_assignments;

-- Create a simpler, more reliable policy
CREATE POLICY "Customers can view their assignments" 
ON public.customer_chatbot_assignments 
FOR SELECT 
USING (
  ((auth.jwt() ->> 'is_customer')::boolean = true) 
  AND 
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = customer_chatbot_assignments.customer_id 
    AND customers.email = (auth.jwt() ->> 'customer_email')
  )
);