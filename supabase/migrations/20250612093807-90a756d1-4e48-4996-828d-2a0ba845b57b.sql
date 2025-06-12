-- Fix Function Search Path Security Issues
-- Update all functions to have immutable search_path for security

-- Fix validate_truck_data function
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
SET search_path = public
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

-- Fix sanitize_text function
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

-- Fix validate_truck_insert_update function
CREATE OR REPLACE FUNCTION public.validate_truck_insert_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

-- Fix validate_task_insert_update function
CREATE OR REPLACE FUNCTION public.validate_task_insert_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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