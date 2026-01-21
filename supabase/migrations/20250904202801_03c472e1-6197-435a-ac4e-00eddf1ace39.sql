-- Add email notification fields to chatbot_forms table
ALTER TABLE public.chatbot_forms 
ADD COLUMN notify_email boolean NOT NULL DEFAULT false,
ADD COLUMN notification_email text,
ADD COLUMN email_subject text DEFAULT 'New Form Submission';

-- Update existing forms to have default email settings
UPDATE public.chatbot_forms 
SET notify_email = false 
WHERE notify_email IS NULL;