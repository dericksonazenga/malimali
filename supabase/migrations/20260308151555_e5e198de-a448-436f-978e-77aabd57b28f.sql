CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert role_permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update role_permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete role_permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (true);

-- Seed with current defaults
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'update_rates'), ('admin', 'delete_entries'), ('admin', 'view_reports'), ('admin', 'manage_workers'), ('admin', 'manage_expenses'), ('admin', 'manage_inventory'),
  ('accountant', 'view_reports'), ('accountant', 'manage_expenses'), ('accountant', 'manage_workers'),
  ('data_manager', 'update_rates'), ('data_manager', 'delete_entries'), ('data_manager', 'manage_inventory'),
  ('human_resource', 'manage_workers'),
  ('cashier', 'manage_expenses'), ('cashier', 'view_reports');

ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;