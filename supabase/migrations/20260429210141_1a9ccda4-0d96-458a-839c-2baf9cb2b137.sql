-- Strengthen multi-tenant admin checks: make is_admin company-scoped.
-- Adds is_admin_of(user, company) and updates policies on tenant tables
-- (custom_roles, role_permissions, profiles) to verify the admin belongs
-- to the SAME company as the row being mutated. This is defense-in-depth
-- on top of the existing company_id = get_user_company_id(auth.uid()) check.

-- 1. New stricter helper: admin AND in the given company.
CREATE OR REPLACE FUNCTION public.is_admin_of(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND company_id = _company_id
  )
$$;

-- 2. Keep is_admin(_user_id) for backward compatibility but tighten its
--    semantics: an admin only counts as admin within their own company.
--    We resolve their company via get_user_company_id and require role=admin
--    in that same company row.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND company_id = public.get_user_company_id(_user_id)
  )
$$;

-- 3. Replace company-scoped admin policies to use is_admin_of(uid, row.company_id).
--    This makes the cross-tenant guarantee explicit at the policy level.

-- custom_roles
DROP POLICY IF EXISTS admin_insert ON public.custom_roles;
DROP POLICY IF EXISTS admin_update ON public.custom_roles;
DROP POLICY IF EXISTS admin_delete ON public.custom_roles;

CREATE POLICY admin_insert ON public.custom_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_of(auth.uid(), company_id));

CREATE POLICY admin_update ON public.custom_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(auth.uid(), company_id))
  WITH CHECK (public.is_admin_of(auth.uid(), company_id));

CREATE POLICY admin_delete ON public.custom_roles
  FOR DELETE TO authenticated
  USING (public.is_admin_of(auth.uid(), company_id));

-- role_permissions
DROP POLICY IF EXISTS admin_insert ON public.role_permissions;
DROP POLICY IF EXISTS admin_update ON public.role_permissions;
DROP POLICY IF EXISTS admin_delete ON public.role_permissions;

CREATE POLICY admin_insert ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_of(auth.uid(), company_id));

CREATE POLICY admin_update ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(auth.uid(), company_id))
  WITH CHECK (public.is_admin_of(auth.uid(), company_id));

CREATE POLICY admin_delete ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.is_admin_of(auth.uid(), company_id));

-- profiles
DROP POLICY IF EXISTS admin_update ON public.profiles;
DROP POLICY IF EXISTS admin_delete ON public.profiles;

CREATE POLICY admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(auth.uid(), company_id))
  WITH CHECK (public.is_admin_of(auth.uid(), company_id));

CREATE POLICY admin_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin_of(auth.uid(), company_id));