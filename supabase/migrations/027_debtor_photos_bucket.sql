-- Create storage bucket for debtor photos extracted from Excel imports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'debtor-photos', 'debtor-photos', true, 5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/bmp','image/webp']
);

-- Admin full access
CREATE POLICY "Admin full access debtor-photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'debtor-photos' AND (SELECT is_admin()))
  WITH CHECK (bucket_id = 'debtor-photos' AND (SELECT is_admin()));

-- Public read (for displaying photos in the UI)
CREATE POLICY "Public read debtor-photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'debtor-photos');
