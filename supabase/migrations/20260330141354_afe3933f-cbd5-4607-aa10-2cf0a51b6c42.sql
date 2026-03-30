
-- Savings accounts table (one row per customer)
CREATE TABLE public.savings_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint on customer_name to prevent duplicates
CREATE UNIQUE INDEX savings_accounts_customer_name_unique ON public.savings_accounts (lower(customer_name));

ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view savings_accounts" ON public.savings_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert savings_accounts" ON public.savings_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update savings_accounts" ON public.savings_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete savings_accounts" ON public.savings_accounts FOR DELETE TO authenticated USING (true);

-- Savings transactions table (deposits & withdrawals history)
CREATE TABLE public.savings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.savings_accounts(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'deposit', -- 'deposit' or 'withdrawal'
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash', -- 'cash', 'mpesa', 'bank'
  served_by_name text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view savings_transactions" ON public.savings_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert savings_transactions" ON public.savings_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete savings_transactions" ON public.savings_transactions FOR DELETE TO authenticated USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_transactions;
