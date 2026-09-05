-- Copy the signup phone from auth metadata onto profiles so admin user details can show it.

UPDATE public.profiles p
SET
  phone = NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''),
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND (p.phone IS NULL OR TRIM(p.phone) = '')
  AND NULLIF(TRIM(u.raw_user_meta_data->>'phone'), '') IS NOT NULL;
