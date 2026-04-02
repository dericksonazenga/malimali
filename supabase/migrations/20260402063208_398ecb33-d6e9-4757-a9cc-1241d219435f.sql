
CREATE TABLE public.custom_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key text NOT NULL,
  display_name text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (role_key, company_id)
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_select" ON public.custom_roles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "admin_insert" ON public.custom_roles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_admin(auth.uid()));

CREATE POLICY "admin_update" ON public.custom_roles
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_admin(auth.uid()));

CREATE POLICY "admin_delete" ON public.custom_roles
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_roles;
