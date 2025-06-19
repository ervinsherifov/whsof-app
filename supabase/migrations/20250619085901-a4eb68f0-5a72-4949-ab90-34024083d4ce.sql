-- Update truck validation to allow past dates for warehouse operations
-- This allows warehouse staff to assign ramps to trucks regardless of their scheduled date

CREATE OR REPLACE FUNCTION public.validate_truck_data(
  p_license_plate text, 
  p_arrival_date date, 
  p_arrival_time time without time zone, 
  p_cargo_description text, 
  p_pallet_count integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Validate license plate (alphanumeric, max 20 chars)
  IF p_license_plate IS NULL OR 
     length(p_license_plate) = 0 OR 
     length(p_license_plate) > 20 OR
     p_license_plate !~ '^[A-Za-z0-9\-\s]+$' THEN
    RAISE EXCEPTION 'Invalid license plate format';
  END IF;

  -- Validate arrival date - ALLOW PAST DATES for warehouse operations
  -- Only check that it's within reasonable bounds (not too far in past/future)
  IF p_arrival_date < CURRENT_DATE - INTERVAL '1 year' OR 
     p_arrival_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'Arrival date must be within 1 year range (past or future)';
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
$function$;