-- Security Fix: Comprehensive RLS Policies Implementation

-- First, enable RLS on all tables that don't have it
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_completion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_handlers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "Trucks are viewable by all authenticated users" ON public.trucks;
DROP POLICY IF EXISTS "Users can create trucks" ON public.trucks;
DROP POLICY IF EXISTS "Users can update trucks" ON public.trucks;
DROP POLICY IF EXISTS "Tasks are viewable by all authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

-- Create helper function to get user role securely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'OFFICE_ADMIN' THEN 2
      WHEN 'WAREHOUSE_STAFF' THEN 3
    END
  LIMIT 1;
$$;

-- TRUCKS TABLE POLICIES
CREATE POLICY "authenticated_users_select_trucks" 
ON public.trucks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "office_admin_insert_trucks" 
ON public.trucks FOR INSERT 
TO authenticated 
WITH CHECK (
  public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
  AND auth.uid() = created_by_user_id
);

CREATE POLICY "staff_update_trucks" 
ON public.trucks FOR UPDATE 
TO authenticated 
USING (
  public.get_current_user_role() IN ('WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN')
);

CREATE POLICY "admin_delete_trucks" 
ON public.trucks FOR DELETE 
TO authenticated 
USING (
  public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
);

-- TASKS TABLE POLICIES
CREATE POLICY "authenticated_users_select_tasks" 
ON public.tasks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "staff_insert_tasks" 
ON public.tasks FOR INSERT 
TO authenticated 
WITH CHECK (
  public.get_current_user_role() IN ('WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN')
  AND auth.uid() = created_by_user_id
);

CREATE POLICY "assigned_users_update_tasks" 
ON public.tasks FOR UPDATE 
TO authenticated 
USING (
  assigned_to_user_id = auth.uid() 
  OR created_by_user_id = auth.uid()
  OR public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
);

CREATE POLICY "creator_admin_delete_tasks" 
ON public.tasks FOR DELETE 
TO authenticated 
USING (
  created_by_user_id = auth.uid()
  OR public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
);

-- USER_ROLES TABLE POLICIES
CREATE POLICY "users_view_own_roles" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "super_admin_manage_roles" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (public.get_current_user_role() = 'SUPER_ADMIN');

-- PROFILES TABLE POLICIES
CREATE POLICY "users_view_all_profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "users_update_own_profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- TIME_ENTRIES TABLE POLICIES
CREATE POLICY "users_view_own_time_entries" 
ON public.time_entries FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
);

CREATE POLICY "users_insert_own_time_entries" 
ON public.time_entries FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_time_entries" 
ON public.time_entries FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- PHOTO TABLES POLICIES
CREATE POLICY "authenticated_users_view_task_photos" 
ON public.task_completion_photos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_users_upload_task_photos" 
ON public.task_completion_photos FOR INSERT 
TO authenticated 
WITH CHECK (uploaded_by_user_id = auth.uid());

CREATE POLICY "authenticated_users_view_truck_photos" 
ON public.truck_completion_photos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_users_upload_truck_photos" 
ON public.truck_completion_photos FOR INSERT 
TO authenticated 
WITH CHECK (uploaded_by_user_id = auth.uid());

-- TRUCK_HANDLERS TABLE POLICIES
CREATE POLICY "authenticated_users_view_truck_handlers" 
ON public.truck_handlers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "staff_insert_truck_handlers" 
ON public.truck_handlers FOR INSERT 
TO authenticated 
WITH CHECK (
  handler_user_id = auth.uid()
  OR public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
);

-- Create input validation functions
CREATE OR REPLACE FUNCTION public.validate_truck_data(
  p_license_plate text,
  p_arrival_date date,
  p_arrival_time time,
  p_cargo_description text,
  p_pallet_count integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate license plate (alphanumeric, max 20 chars)
  IF p_license_plate IS NULL OR 
     length(p_license_plate) = 0 OR 
     length(p_license_plate) > 20 OR
     p_license_plate !~ '^[A-Za-z0-9\-\s]+$' THEN
    RAISE EXCEPTION 'Invalid license plate format';
  END IF;

  -- Validate arrival date (not in the past, within 1 year)
  IF p_arrival_date < CURRENT_DATE OR 
     p_arrival_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'Arrival date must be between today and 1 year from now';
  END IF;

  -- Validate cargo description (no HTML tags, max 500 chars)
  IF p_cargo_description IS NULL OR 
     length(p_cargo_description) = 0 OR 
     length(p_cargo_description) > 500 OR
     p_cargo_description ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid cargo description';
  END IF;

  -- Validate pallet count (positive integer, max 100)
  IF p_pallet_count IS NULL OR 
     p_pallet_count <= 0 OR 
     p_pallet_count > 100 THEN
    RAISE EXCEPTION 'Pallet count must be between 1 and 100';
  END IF;

  RETURN true;
END;
$$;

-- Create text sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove HTML tags and sanitize
  RETURN regexp_replace(
    regexp_replace(input_text, '<[^>]*>', '', 'g'),
    '[<>&"'']', 
    '', 
    'g'
  );
END;
$$;

-- Add trigger for truck data validation
CREATE OR REPLACE FUNCTION public.validate_truck_insert_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sanitize text inputs
  NEW.license_plate := upper(trim(public.sanitize_text(NEW.license_plate)));
  NEW.cargo_description := trim(public.sanitize_text(NEW.cargo_description));
  NEW.assigned_staff_name := trim(public.sanitize_text(NEW.assigned_staff_name));
  NEW.handled_by_name := trim(public.sanitize_text(NEW.handled_by_name));
  
  -- Validate truck data
  PERFORM public.validate_truck_data(
    NEW.license_plate,
    NEW.arrival_date,
    NEW.arrival_time,
    NEW.cargo_description,
    NEW.pallet_count
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_truck_data_trigger
  BEFORE INSERT OR UPDATE ON public.trucks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_truck_insert_update();

-- Add trigger for task data validation
CREATE OR REPLACE FUNCTION public.validate_task_insert_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sanitize text inputs
  NEW.title := trim(public.sanitize_text(NEW.title));
  NEW.description := trim(public.sanitize_text(NEW.description));
  NEW.completion_comment := trim(public.sanitize_text(NEW.completion_comment));
  NEW.assigned_to_name := trim(public.sanitize_text(NEW.assigned_to_name));
  
  -- Validate required fields
  IF NEW.title IS NULL OR length(NEW.title) = 0 THEN
    RAISE EXCEPTION 'Task title is required';
  END IF;
  
  IF length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Task title too long (max 200 characters)';
  END IF;
  
  IF NEW.description IS NOT NULL AND length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Task description too long (max 1000 characters)';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_task_data_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_insert_update();