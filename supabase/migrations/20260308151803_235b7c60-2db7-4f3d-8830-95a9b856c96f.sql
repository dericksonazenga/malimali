CREATE TABLE public.daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  agent_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  vip_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  sales_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  expenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_agent_amount numeric NOT NULL DEFAULT 0,
  total_vip_amount numeric NOT NULL DEFAULT 0,
  total_sales_amount numeric NOT NULL DEFAULT 0,
  total_expenses numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  UNIQUE(date)
);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily_summaries"
  ON public.daily_summaries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert daily_summaries"
  ON public.daily_summaries FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update daily_summaries"
  ON public.daily_summaries FOR UPDATE TO authenticated
  USING (true);