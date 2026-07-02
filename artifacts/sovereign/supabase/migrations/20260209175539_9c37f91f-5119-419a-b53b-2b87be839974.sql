
-- Create media-messages storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media-messages', 'media-messages', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for media-messages bucket
CREATE POLICY "Anyone can view media messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-messages');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media-messages' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add media_url column to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type TEXT;
