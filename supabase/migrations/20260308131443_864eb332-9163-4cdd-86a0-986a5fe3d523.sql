
CREATE TABLE public.commodities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  agent_rate numeric NOT NULL DEFAULT 0,
  vip_rate numeric NOT NULL DEFAULT 0,
  sales_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view commodities"
  ON public.commodities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert commodities"
  ON public.commodities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update commodities"
  ON public.commodities FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can delete commodities"
  ON public.commodities FOR DELETE
  TO authenticated
  USING (true);

-- Seed default commodities
INSERT INTO public.commodities (name, agent_rate, vip_rate, sales_rate) VALUES
  ('Iron', 28, 30, 35),
  ('Copper', 450, 470, 520),
  ('Aluminium', 120, 130, 155),
  ('Brass', 340, 360, 400),
  ('Steel', 25, 27, 32),
  ('Plastic', 12, 14, 18);
