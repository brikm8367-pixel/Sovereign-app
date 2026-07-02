
-- Add voice_url column to messages for voice messages
ALTER TABLE public.messages ADD COLUMN voice_url TEXT;

-- Create voice messages storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true);

-- Storage policies for voice messages
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');

CREATE POLICY "Voice messages are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);
