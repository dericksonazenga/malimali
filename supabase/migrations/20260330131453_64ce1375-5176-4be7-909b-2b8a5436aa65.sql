
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'payment')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_by_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit_log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_audit_log_table_record ON public.audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
