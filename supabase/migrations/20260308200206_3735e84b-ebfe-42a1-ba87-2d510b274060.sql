
-- Fix 1: Remove anon SELECT policy on recruited_workers that exposes PII
DROP POLICY IF EXISTS "Anon can check recruited_workers" ON public.recruited_workers;

-- Fix 2: Restrict role_permissions write operations to admin users only
DROP POLICY IF EXISTS "Authenticated users can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated users can update role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated users can delete role_permissions" ON public.role_permissions;

CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update role_permissions" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
