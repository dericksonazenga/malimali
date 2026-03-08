
DO $$
BEGIN
  -- Only add tables not yet in the publication
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vip_entries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_entries;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sales_entries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_entries;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'persistent_stock') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.persistent_stock;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'end_of_day_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.end_of_day_log;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'expenses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;
  END IF;
END $$;
