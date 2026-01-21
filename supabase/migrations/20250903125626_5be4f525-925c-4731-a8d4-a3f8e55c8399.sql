-- Fix the INSERT policy for customers table
DROP POLICY IF EXISTS "Chatbot owners can create customers" ON public.customers;

-- Create a proper INSERT policy that allows authenticated users to create customers
CREATE POLICY "Anyone can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');