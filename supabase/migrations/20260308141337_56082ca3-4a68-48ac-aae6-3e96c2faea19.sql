CREATE TABLE public.recruited_workers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'boss',
  recruited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed boolean NOT NULL DEFAULT false,
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE public.recruited_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recruited_workers" ON public.recruited_workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recruited_workers" ON public.recruited_workers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recruited_workers" ON public.recruited_workers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recruited_workers" ON public.recruited_workers FOR DELETE TO authenticated USING (true);

-- Allow anon to check if email/phone is pre-registered (for signup validation)
CREATE POLICY "Anon can check recruited_workers" ON public.recruited_workers FOR SELECT TO anon USING (true);