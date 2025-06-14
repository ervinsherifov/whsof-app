-- Fix date validation to properly allow today's date
-- The current logic is confusing and error-prone

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
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate license plate (alphanumeric, max 20 chars)
  IF p_license_plate IS NULL OR 
     length(p_license_plate) = 0 OR 
     length(p_license_plate) > 20 OR
     p_license_plate !~ '^[A-Za-z0-9\-\s]+$' THEN
    RAISE EXCEPTION 'Invalid license plate format';
  END IF;

  -- Validate arrival date (today or future, within 1 year)
  -- Simplified logic: reject dates before today, allow today and future
  IF p_arrival_date < CURRENT_DATE OR 
     p_arrival_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'Arrival date must be today or in the future (within 1 year)';
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

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_trucks_arrival_date ON public.trucks(arrival_date);
CREATE INDEX IF NOT EXISTS idx_trucks_status_priority ON public.trucks(status, priority);
CREATE INDEX IF NOT EXISTS idx_user_kpi_metrics_date_user ON public.user_kpi_metrics(metric_date, user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON public.time_entries(user_id, check_in_time);

-- Add RLS policies for better security (only on actual tables, not views)
ALTER TABLE public.user_kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- User KPI metrics should be viewable by authenticated users
CREATE POLICY "User KPI metrics are viewable by authenticated users" 
ON public.user_kpi_metrics 
FOR SELECT 
TO authenticated 
USING (true);

-- Time entries should be manageable by the user themselves or admins
CREATE POLICY "Users can manage their own time entries" 
ON public.time_entries 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid() OR public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));