-- Temporarily simplify the RLS policy to debug the issue
-- Let's see if the issue is with the JWT parsing

-- Drop the existing policy
DROP POLICY IF EXISTS "Customers can view their assignments" ON public.customer_chatbot_assignments;

-- Create a temporary policy that allows any authenticated user with is_customer=true in metadata
CREATE POLICY "Customers can view their assignments" 
ON public.customer_chatbot_assignments 
FOR SELECT 
USING (
  (auth.jwt() ->> 'user_metadata') IS NOT NULL
  AND 
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true)
);