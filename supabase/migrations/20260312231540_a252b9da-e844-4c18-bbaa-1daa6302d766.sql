
CREATE TABLE public.rate_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commodity_id UUID NOT NULL,
  commodity_name TEXT NOT NULL,
  old_agent_rate NUMERIC NOT NULL DEFAULT 0,
  old_vip_rate NUMERIC NOT NULL DEFAULT 0,
  old_sales_rate NUMERIC NOT NULL DEFAULT 0,
  new_agent_rate NUMERIC NOT NULL DEFAULT 0,
  new_vip_rate NUMERIC NOT NULL DEFAULT 0,
  new_sales_rate NUMERIC NOT NULL DEFAULT 0,
  changed_by UUID,
  changed_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rate_change_history" ON public.rate_change_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rate_change_history" ON public.rate_change_history
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rate_change_history" ON public.rate_change_history
  FOR DELETE TO authenticated USING (true);
