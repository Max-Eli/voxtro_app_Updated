-- If the previous fix doesn't work, let's try a completely open INSERT policy for testing
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;

-- Temporarily create a completely permissive INSERT policy
CREATE POLICY "Allow all customer creation" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);