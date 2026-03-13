
-- App-wide settings table (for global currency set by admin)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Authenticated users can view app_settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert app_settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update app_settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert default global currency
INSERT INTO public.app_settings (key, value) VALUES ('global_currency', 'KES');

-- Add personal currency preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency_preference text DEFAULT NULL;

-- Enable realtime for app_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
