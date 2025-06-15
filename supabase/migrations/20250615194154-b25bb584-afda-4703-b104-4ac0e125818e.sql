-- Fix the handle_new_user function to properly handle app_role casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Check if user email is in approved users list
  IF NOT EXISTS (
    SELECT 1 FROM public.approved_users 
    WHERE email = NEW.email
  ) THEN
    -- Delete the user immediately if not approved
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'Access denied: User not in approved list';
  END IF;
  
  -- Get the approved role for this user
  DECLARE
    approved_role TEXT;
  BEGIN
    SELECT role INTO approved_role
    FROM public.approved_users
    WHERE email = NEW.email;
    
    -- Create profile
    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    
    -- Assign the approved role with proper casting
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, approved_role::public.app_role);
  END;
  
  RETURN NEW;
END;
$function$;