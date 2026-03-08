
CREATE TABLE public.persistent_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commodity text NOT NULL UNIQUE,
  weight numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.persistent_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view persistent_stock" ON public.persistent_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert persistent_stock" ON public.persistent_stock FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update persistent_stock" ON public.persistent_stock FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete persistent_stock" ON public.persistent_stock FOR DELETE TO authenticated USING (true);
