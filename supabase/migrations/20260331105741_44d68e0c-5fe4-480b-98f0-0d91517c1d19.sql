
CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  worker_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'regular',
  paid_by_name text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view salary_payments"
  ON public.salary_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert salary_payments"
  ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete salary_payments"
  ON public.salary_payments FOR DELETE TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_payments;
