
-- Creditors table: people who take commodities and pay later
CREATE TABLE public.creditors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  commodity TEXT NOT NULL,
  kg NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  recorded_by UUID,
  recorded_by_name TEXT NOT NULL DEFAULT '',
  company_id UUID NOT NULL REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_select" ON public.creditors FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "co_insert" ON public.creditors FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "co_update" ON public.creditors FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "co_delete" ON public.creditors FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Creditor payments table
CREATE TABLE public.creditor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor_id UUID NOT NULL REFERENCES public.creditors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  paid_by UUID,
  paid_by_name TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  company_id UUID NOT NULL REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creditor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_select" ON public.creditor_payments FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "co_insert" ON public.creditor_payments FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "co_delete" ON public.creditor_payments FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.creditors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creditor_payments;
