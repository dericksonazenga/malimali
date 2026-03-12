CREATE POLICY "Authenticated users can delete end_of_day_log"
ON public.end_of_day_log
FOR DELETE
TO authenticated
USING (true);