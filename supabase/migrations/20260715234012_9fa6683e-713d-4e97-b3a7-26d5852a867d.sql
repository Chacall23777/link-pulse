CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  -- Admin role is NEVER auto-granted. Bootstrap the first admin manually:
  --   INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin');
  -- Subsequent employees are created via the admin-only invite flow.
  RETURN NEW;
END;
$function$;