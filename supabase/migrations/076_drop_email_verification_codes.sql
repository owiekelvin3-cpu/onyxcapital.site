-- Signup verification now uses Supabase Auth email OTP only.
-- Do not store one-time codes in the application database.
DROP TABLE IF EXISTS public.email_verification_codes;
