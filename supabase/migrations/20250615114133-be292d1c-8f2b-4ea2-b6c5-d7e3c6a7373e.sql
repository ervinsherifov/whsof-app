-- Production cleanup: Remove test data and restrict signups
-- 1. Clean up test data (uncomment lines for data you want to remove)

-- Clear test trucks (keep this commented if you want to preserve any real data)
-- DELETE FROM public.trucks WHERE created_at > '2025-01-01';

-- Clear test tasks 
-- DELETE FROM public.tasks WHERE created_at > '2025-01-01';

-- Clear test time entries
-- DELETE FROM public.time_entries WHERE created_at > '2025-01-01';

-- Clear test photos
-- DELETE FROM public.truck_completion_photos WHERE created_at > '2025-01-01';

-- 2. Create an approved users table for production access control
CREATE TABLE IF NOT EXISTS public.approved_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'WAREHOUSE_STAFF',
  approved_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on approved users
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage approved users
CREATE POLICY "Super admins can manage approved users" 
ON public.approved_users 
FOR ALL 
USING (public.get_current_user_role() = 'SUPER_ADMIN');

-- 3. Update the handle_new_user function to check approved users
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
    
    -- Assign the approved role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, approved_role::app_role);
  END;
  
  RETURN NEW;
END;
$function$;