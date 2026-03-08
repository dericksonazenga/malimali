
CREATE TABLE public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL,
  previous_weight numeric NOT NULL DEFAULT 0,
  new_weight numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  adjusted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock_adjustments"
  ON public.stock_adjustments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock_adjustments"
  ON public.stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = adjusted_by);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_adjustments;
