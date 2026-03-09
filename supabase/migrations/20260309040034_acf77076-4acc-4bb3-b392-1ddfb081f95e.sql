-- Update handle_new_user to mark recruited worker as claimed on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _phone text;
  _role text;
BEGIN
  -- Try to find the phone and role from recruited_workers if signup was via email
  SELECT phone, role INTO _phone, _role
  FROM public.recruited_workers
  WHERE email = NEW.email
  LIMIT 1;

  -- Mark the recruited worker as claimed
  UPDATE public.recruited_workers
  SET claimed = true
  WHERE email = NEW.email;

  INSERT INTO public.profiles (user_id, display_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(_role, NEW.raw_user_meta_data->>'role', 'boss'),
    _phone
  );
  RETURN NEW;
END;
$$;