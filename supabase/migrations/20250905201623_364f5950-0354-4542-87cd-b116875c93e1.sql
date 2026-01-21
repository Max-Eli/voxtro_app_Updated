-- Fix the customers table RLS policy for customer self-access
-- The customer should be able to view their own profile using their email from JWT

-- First check if there's already a policy allowing customers to view their own profile
-- DROP POLICY IF EXISTS "Customers can view their own profile" ON public.customers;

-- Create a proper policy for customers to view their own profile
CREATE POLICY "Customers can view their own profile" 
ON public.customers 
FOR SELECT 
USING (
  ((auth.jwt() ->> 'is_customer')::boolean = true) 
  AND 
  (email = (auth.jwt() ->> 'customer_email'))
);