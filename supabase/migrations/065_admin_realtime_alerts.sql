-- Realtime events for admin push/sound alerts on pending items.

ALTER TABLE public.deposits REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.kyc_submissions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'deposits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'withdrawals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'kyc_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_submissions;
  END IF;
END;
$$;
