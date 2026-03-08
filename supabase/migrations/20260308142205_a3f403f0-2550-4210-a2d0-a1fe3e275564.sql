
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
BEGIN
  -- Try to find the phone from recruited_workers if signup was via email
  SELECT phone INTO _phone
  FROM public.recruited_workers
  WHERE email = NEW.email
  LIMIT 1;

  INSERT INTO public.profiles (user_id, display_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'boss'),
    _phone
  );
  RETURN NEW;
END;
$function$;
