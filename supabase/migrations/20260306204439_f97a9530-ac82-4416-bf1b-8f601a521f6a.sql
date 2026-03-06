
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  verified_by text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (true);
