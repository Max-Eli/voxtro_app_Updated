-- Add RLS policy for customers to view their tickets by email
CREATE POLICY "Customers can view tickets by their email"
ON public.support_tickets
FOR SELECT
USING (
  customer_email = (SELECT email FROM customers WHERE id = public.get_current_customer_id_secure())
);

-- Add RLS policy for customers to view messages on their tickets
CREATE POLICY "Customers can view messages on their tickets"
ON public.support_ticket_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE customer_email = (SELECT email FROM customers WHERE id = public.get_current_customer_id_secure())
  )
);

-- Add RLS policy for customers to insert messages on their tickets
CREATE POLICY "Customers can reply to their tickets"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE customer_email = (SELECT email FROM customers WHERE id = public.get_current_customer_id_secure())
  )
  AND sender_type = 'customer'
);