
CREATE TABLE public.end_of_day_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_by uuid NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text NULL
);

ALTER TABLE public.end_of_day_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view end_of_day_log" ON public.end_of_day_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert end_of_day_log" ON public.end_of_day_log FOR INSERT TO authenticated WITH CHECK (true);
