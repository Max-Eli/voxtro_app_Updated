-- Enable realtime for support_tickets table
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

-- Enable realtime for support_ticket_messages table
ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;