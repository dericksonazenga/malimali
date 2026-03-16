
-- 1. Add UPDATE RLS policies for entry tables
CREATE POLICY "Authenticated users can update agent_entries"
ON public.agent_entries FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can update vip_entries"
ON public.vip_entries FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales_entries"
ON public.sales_entries FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- 2. Create trigger function to auto-update pending entries when commodity rates change
CREATE OR REPLACE FUNCTION public.update_pending_entries_on_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update agent entries with rate=0 for this commodity (today only)
  UPDATE public.agent_entries
  SET rate = NEW.agent_rate,
      amount = actual_weight * NEW.agent_rate
  WHERE commodity = NEW.name
    AND rate = 0
    AND date = CURRENT_DATE;

  -- Update vip entries with rate=0 for this commodity (today only)
  UPDATE public.vip_entries
  SET rate = NEW.vip_rate,
      amount = actual_weight * NEW.vip_rate
  WHERE commodity = NEW.name
    AND rate = 0
    AND date = CURRENT_DATE;

  -- Update sales entries with rate=0 or NULL for this commodity (today only)
  UPDATE public.sales_entries
  SET rate = NEW.sales_rate,
      amount = weight * NEW.sales_rate
  WHERE commodity = NEW.name
    AND (rate = 0 OR rate IS NULL)
    AND is_exchange = false
    AND date = CURRENT_DATE;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on commodities table
CREATE TRIGGER on_commodity_rate_update
AFTER UPDATE ON public.commodities
FOR EACH ROW
WHEN (OLD.agent_rate IS DISTINCT FROM NEW.agent_rate
   OR OLD.vip_rate IS DISTINCT FROM NEW.vip_rate
   OR OLD.sales_rate IS DISTINCT FROM NEW.sales_rate)
EXECUTE FUNCTION public.update_pending_entries_on_rate_change();
