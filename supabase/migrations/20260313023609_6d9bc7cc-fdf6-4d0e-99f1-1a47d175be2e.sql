
CREATE OR REPLACE FUNCTION public.check_pre_registration(check_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('found', true, 'name', rw.name, 'role', rw.role, 'id', rw.id)
  INTO result
  FROM public.recruited_workers rw
  WHERE rw.email = lower(check_email) AND rw.claimed = false
  LIMIT 1;

  IF result IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN result;
END;
$$;
