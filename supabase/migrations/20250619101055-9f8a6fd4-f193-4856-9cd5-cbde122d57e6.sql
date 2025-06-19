-- Update calculate_work_hours function to use Bulgaria timezone and fix overtime logic
CREATE OR REPLACE FUNCTION public.calculate_work_hours(
  p_user_id uuid, 
  p_check_in_time timestamp with time zone, 
  p_check_out_time timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  total_hours NUMERIC;
  regular_hours NUMERIC := 0;
  overtime_hours NUMERIC := 0;
  -- Use Bulgaria timezone for work date calculation
  work_date DATE := (p_check_in_time AT TIME ZONE 'Europe/Sofia')::DATE;
  check_day_of_week INTEGER := EXTRACT(DOW FROM (p_check_in_time AT TIME ZONE 'Europe/Sofia'));
  is_holiday BOOLEAN := false;
  is_weekend BOOLEAN := false;
  is_working_day BOOLEAN := true;
  overtime_reasons TEXT[] := ARRAY[]::TEXT[];
  user_schedule RECORD;
BEGIN
  -- Calculate total hours
  total_hours := EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 3600.0;
  
  -- Check if it's a weekend (Saturday=6, Sunday=0)
  IF check_day_of_week IN (0, 6) THEN
    is_weekend := true;
  END IF;
  
  -- Check if it's a holiday
  SELECT EXISTS(
    SELECT 1 FROM holidays 
    WHERE date = work_date AND is_active = true
  ) INTO is_holiday;
  
  -- Check user's work schedule
  SELECT * INTO user_schedule
  FROM work_schedules ws
  WHERE ws.user_id = p_user_id AND ws.day_of_week = check_day_of_week;
  
  -- Determine if it's a working day
  IF user_schedule.id IS NOT NULL THEN
    is_working_day := user_schedule.is_working_day;
  ELSE
    -- Default: weekdays are working days, weekends are not
    is_working_day := (check_day_of_week BETWEEN 1 AND 5);
  END IF;
  
  -- Override working day if it's a holiday
  IF is_holiday THEN
    is_working_day := false;
  END IF;
  
  -- Calculate hours based on work day type
  IF NOT is_working_day THEN
    -- Weekend or holiday work = all overtime
    overtime_hours := total_hours;
    regular_hours := 0;
    IF is_weekend THEN
      overtime_reasons := overtime_reasons || ARRAY['weekend'];
    END IF;
    IF is_holiday THEN
      overtime_reasons := overtime_reasons || ARRAY['holiday'];
    END IF;
  ELSE
    -- Regular work day: 9 hours standard, rest is overtime
    regular_hours := LEAST(total_hours, 9);
    overtime_hours := GREATEST(0, total_hours - 9);
    IF overtime_hours > 0 THEN
      overtime_reasons := overtime_reasons || ARRAY['daily_excess'];
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'total_hours', total_hours,
    'regular_hours', regular_hours,
    'overtime_hours', overtime_hours,
    'is_weekend', is_weekend,
    'is_holiday', is_holiday,
    'overtime_reasons', overtime_reasons,
    'requires_approval', (overtime_hours > 0),
    'work_date_bulgaria', work_date,
    'timezone', 'Europe/Sofia'
  );
END;
$function$;