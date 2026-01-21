-- Add notification_email column to notification_preferences table
ALTER TABLE public.notification_preferences 
ADD COLUMN notification_email text;