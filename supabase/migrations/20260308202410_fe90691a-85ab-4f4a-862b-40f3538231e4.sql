
-- Add delete policy for stock_adjustments (admin only via profile role check)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

CREATE POLICY "Admins can delete stock_adjustments"
  ON public.stock_adjustments FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
