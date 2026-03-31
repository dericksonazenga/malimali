-- Add unique constraint on key+company_id for app_settings to support upsert
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_key_company_unique UNIQUE (key, company_id);

-- Add sysadmin bypass policies on app_settings for PIN storage
CREATE POLICY "sysadmin_select_app_settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (is_system_admin(auth.uid()));

CREATE POLICY "sysadmin_insert_app_settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin(auth.uid()));

CREATE POLICY "sysadmin_update_app_settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (is_system_admin(auth.uid()));