-- Permanently remove daily_summaries table and realtime publication
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'daily_summaries') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.daily_summaries;
  END IF;
END $$;

DROP TABLE IF EXISTS public.daily_summaries CASCADE;