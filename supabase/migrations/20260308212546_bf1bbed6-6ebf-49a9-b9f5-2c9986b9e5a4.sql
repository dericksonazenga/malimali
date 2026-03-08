
CREATE TABLE public.attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attendance_settings"
  ON public.attendance_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attendance_settings"
  ON public.attendance_settings FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance_settings"
  ON public.attendance_settings FOR UPDATE
  TO authenticated USING (true);

INSERT INTO public.attendance_settings (key, value) VALUES ('shift_start_time', '08:00');
