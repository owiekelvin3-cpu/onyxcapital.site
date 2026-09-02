-- Live dashboard balance + copy subscription updates via Supabase Realtime

ALTER TABLE public.balances REPLICA IDENTITY FULL;
ALTER TABLE public.copy_trading_subscriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'balances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.balances;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'copy_trading_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_trading_subscriptions;
  END IF;
END $$;
