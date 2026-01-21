-- Add fields to store crawled website content
ALTER TABLE public.chatbots 
ADD COLUMN website_content TEXT,
ADD COLUMN last_crawled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN crawl_status TEXT DEFAULT 'pending';