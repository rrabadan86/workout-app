-- Migration: Workout Photos & Share Card
-- Adds photoUrl column to feed_events for storing workout completion photos

-- 1. Add photoUrl column
ALTER TABLE feed_events ADD COLUMN IF NOT EXISTS "photoUrl" TEXT DEFAULT NULL;

-- 2. Create Storage bucket (run in Supabase Dashboard > Storage > New bucket)
-- Name: workout-photos
-- Public: Yes
-- File size limit: 5MB (5242880 bytes)
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- 3. Storage Policies (run in SQL Editor after creating the bucket)

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own workout photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for feed display
CREATE POLICY "Workout photos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workout-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own workout photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
