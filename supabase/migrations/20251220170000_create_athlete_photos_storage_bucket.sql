-- Create storage bucket for athlete photos
-- This bucket will store player/athlete photos

-- Insert the bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'athlete-photos',
    'athlete-photos',
    true, -- Public bucket so images can be accessed without authentication
    5242880, -- 5MB file size limit (in bytes)
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] -- Allowed image types
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for athlete-photos bucket

-- Policy 1: Allow public read access to all files
CREATE POLICY "Public can view athlete photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'athlete-photos');

-- Policy 2: Allow authenticated users to upload photos (for admin use)
CREATE POLICY "Authenticated users can upload athlete photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'athlete-photos' 
    AND auth.role() = 'authenticated'
);

-- Policy 3: Allow authenticated users to update photos (for admin use)
CREATE POLICY "Authenticated users can update athlete photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'athlete-photos' 
    AND auth.role() = 'authenticated'
);

-- Policy 4: Allow authenticated users to delete photos (for admin use)
CREATE POLICY "Authenticated users can delete athlete photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'athlete-photos' 
    AND auth.role() = 'authenticated'
);

