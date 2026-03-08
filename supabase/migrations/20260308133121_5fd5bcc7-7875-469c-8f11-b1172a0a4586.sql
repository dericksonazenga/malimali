
-- Agent entries table
CREATE TABLE public.agent_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  commodity text NOT NULL,
  gross_weight numeric NOT NULL DEFAULT 0,
  container_weight numeric NOT NULL DEFAULT 0,
  actual_weight numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  weight_image text,
  item_image text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.agent_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent_entries" ON public.agent_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agent_entries" ON public.agent_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete agent_entries" ON public.agent_entries FOR DELETE TO authenticated USING (true);

-- VIP entries table
CREATE TABLE public.vip_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  commodity text NOT NULL,
  gross_weight numeric NOT NULL DEFAULT 0,
  container_weight numeric NOT NULL DEFAULT 0,
  actual_weight numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  weight_image text,
  item_image text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.vip_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vip_entries" ON public.vip_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vip_entries" ON public.vip_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vip_entries" ON public.vip_entries FOR DELETE TO authenticated USING (true);

-- Sales entries table
CREATE TABLE public.sales_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  commodity text,
  weight numeric NOT NULL DEFAULT 0,
  rate numeric,
  amount numeric,
  weight_image text,
  item_image text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales_entries" ON public.sales_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales_entries" ON public.sales_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete sales_entries" ON public.sales_entries FOR DELETE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_entries;
