-- Create the 'avatars' storage bucket used by Profile.tsx / PublicProfile.tsx.
-- This bucket was referenced in code (supabase.storage.from('avatars')) but was
-- never created via migration, so all avatar uploads were failing with a
-- "bucket not found" error.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Files are stored at bucket root as "<user_id>-<timestamp>.<ext>" (no per-user folder).

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND name LIKE auth.uid()::text || '-%'
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '-%')
WITH CHECK (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '-%');

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '-%');
