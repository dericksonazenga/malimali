-- Auto-fill company_id from authenticated user on insert, so client never needs to pass it
CREATE OR REPLACE FUNCTION public.set_company_id_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL OR NEW.company_id::text = '' THEN
    NEW.company_id := public.get_user_company_id(auth.uid());
  END IF;
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve company for user %', auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['agent_entries','vip_entries','sales_entries','expenses','debts','savings_entries','persistent_stock','commodities'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='company_id') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_company_id ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_set_company_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_auth()', t);
    END IF;
  END LOOP;
END $$;