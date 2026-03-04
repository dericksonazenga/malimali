
-- Attendance records table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL,
  worker_id text,
  sign_in_at timestamptz,
  sign_out_at timestamptz,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Biometric credentials table
CREATE TABLE public.biometric_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL UNIQUE,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Attendance policies - authenticated users can read/write
CREATE POLICY "Authenticated users can view attendance" ON public.attendance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attendance" ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance" ON public.attendance
  FOR UPDATE TO authenticated USING (true);

-- Biometric credentials policies
CREATE POLICY "Authenticated users can view credentials" ON public.biometric_credentials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert credentials" ON public.biometric_credentials
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete credentials" ON public.biometric_credentials
  FOR DELETE TO authenticated USING (true);
