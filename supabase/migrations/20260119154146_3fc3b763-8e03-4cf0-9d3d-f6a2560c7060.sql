-- Create branding_settings table for white-label customization
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f97316',
  secondary_color TEXT DEFAULT '#ea580c',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own branding
CREATE POLICY "Users can view their own branding"
ON public.branding_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own branding"
ON public.branding_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding"
ON public.branding_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own branding"
ON public.branding_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Customers can view branding of admins they're assigned to
CREATE POLICY "Customers can view assigned admin branding"
ON public.branding_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_chatbot_assignments cca
    JOIN public.customers c ON cca.customer_id = c.id
    JOIN public.chatbots cb ON cca.chatbot_id = cb.id
    WHERE c.email = auth.email()
    AND cb.user_id = branding_settings.user_id
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Storage policies for logo uploads
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);