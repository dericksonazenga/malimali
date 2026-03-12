
CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view debts" ON public.debts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert debts" ON public.debts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update debts" ON public.debts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete debts" ON public.debts
  FOR DELETE TO authenticated USING (true);

CREATE TABLE public.debt_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  paid_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view debt_payments" ON public.debt_payments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert debt_payments" ON public.debt_payments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete debt_payments" ON public.debt_payments
  FOR DELETE TO authenticated USING (true);
