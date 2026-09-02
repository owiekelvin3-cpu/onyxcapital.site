-- Restrict KYC document storage to owners and admins (private bucket)

UPDATE storage.buckets
SET public = false
WHERE id = 'kyc-documents';

DROP POLICY IF EXISTS "Anyone can view KYC docs" ON storage.objects;

DROP POLICY IF EXISTS "Users can view own KYC docs" ON storage.objects;
CREATE POLICY "Users can view own KYC docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);
