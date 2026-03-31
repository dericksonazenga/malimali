
-- Allow system admins to manage recruited_workers for any company
CREATE POLICY "sysadmin_insert" ON public.recruited_workers
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin(auth.uid()));

CREATE POLICY "sysadmin_select" ON public.recruited_workers
  FOR SELECT TO authenticated
  USING (is_system_admin(auth.uid()));

CREATE POLICY "sysadmin_update" ON public.recruited_workers
  FOR UPDATE TO authenticated
  USING (is_system_admin(auth.uid()));

CREATE POLICY "sysadmin_delete" ON public.recruited_workers
  FOR DELETE TO authenticated
  USING (is_system_admin(auth.uid()));
