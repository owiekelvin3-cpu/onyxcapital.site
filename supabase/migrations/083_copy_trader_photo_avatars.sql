-- Allow copy trader avatars uploaded from an admin device.
-- Photos live in the public avatars bucket under copy-traders/.

ALTER TABLE public.copy_traders
  DROP CONSTRAINT IF EXISTS copy_traders_avatar_kind_check;

ALTER TABLE public.copy_traders
  ADD CONSTRAINT copy_traders_avatar_kind_check
  CHECK (avatar_kind IN ('anime', 'illustrated', 'gradient', 'pixel', 'emoji', 'photo'));

DROP POLICY IF EXISTS "Admins can upload copy trader avatars" ON storage.objects;
CREATE POLICY "Admins can upload copy trader avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'copy-traders'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update copy trader avatars" ON storage.objects;
CREATE POLICY "Admins can update copy trader avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'copy-traders'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'copy-traders'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete copy trader avatars" ON storage.objects;
CREATE POLICY "Admins can delete copy trader avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'copy-traders'
    AND public.is_admin()
  );
