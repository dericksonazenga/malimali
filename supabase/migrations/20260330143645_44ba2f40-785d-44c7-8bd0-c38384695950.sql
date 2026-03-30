CREATE POLICY "Authorized users can delete audit_log"
ON public.audit_log
FOR DELETE
TO authenticated
USING (true);