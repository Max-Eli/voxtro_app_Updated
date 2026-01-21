-- Drop the current INSERT policy and create a more permissive one
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;

-- Create a simpler INSERT policy using auth.uid()
CREATE POLICY "Authenticated users can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);