-- Create the order-files storage bucket for artwork and STL uploads.
-- Run this once in the Supabase SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-files',
  'order-files',
  true,
  104857600,  -- 100 MB max per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'model/stl', 'application/octet-stream', 'application/sla']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own order folders
CREATE POLICY "order-files: upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = 'orders'
  );

-- Allow authenticated users to read their own files
CREATE POLICY "order-files: read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = 'orders'
  );

-- Allow admins to read and delete all files
CREATE POLICY "order-files: admin all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'order-files'
    AND public.is_admin()
  );
