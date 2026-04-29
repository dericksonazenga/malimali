ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_address text;

-- Allow company admins to update their own company row (so they can save contact details).
DROP POLICY IF EXISTS "admin_update_own_company" ON public.companies;
CREATE POLICY "admin_update_own_company"
ON public.companies
FOR UPDATE
TO authenticated
USING (is_admin_of(auth.uid(), id))
WITH CHECK (is_admin_of(auth.uid(), id));