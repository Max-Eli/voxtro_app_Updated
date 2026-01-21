-- Fix the authentication flow issue by allowing unauthenticated access for sign-in verification
-- We need to allow the sign-in process to verify customer exists before authentication

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;

-- Create a more permissive policy that allows reading for sign-in verification
CREATE POLICY "Allow customer sign-in verification" 
ON public.customers 
FOR SELECT 
USING (true);

-- Keep the existing customer self-access policy
-- The "Customers can view their own profile" policy should remain for authenticated access