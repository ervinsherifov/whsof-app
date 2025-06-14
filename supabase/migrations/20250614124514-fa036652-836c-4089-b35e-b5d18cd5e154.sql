-- Fix array handling in the calculate_work_hours function and time_entries table
-- The issue is with how arrays are being formatted when returned from the function

-- First, let's check the current time_entries table structure for the overtime_reason column
-- and fix the array handling in the calculate_work_hours function

CREATE OR REPLACE FUNCTION public.calculate_work_hours(
  p_user_id UUID,
  p_check_in_time TIMESTAMP WITH TIME ZONE,
  p_check_out_time TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_hours NUMERIC;
  regular_hours NUMERIC := 0;
  overtime_hours NUMERIC := 0;
  work_date DATE;
  check_day_of_week INTEGER;
  is_holiday BOOLEAN := false;
  is_weekend BOOLEAN := false;
  is_working_day BOOLEAN := true;
  overtime_reasons TEXT[] := ARRAY[]::TEXT[];  -- Properly initialize as empty array
  user_schedule RECORD;
BEGIN
  -- Calculate total hours
  total_hours := EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 3600.0;
  work_date := p_check_in_time::DATE;
  check_day_of_week := EXTRACT(DOW FROM work_date);
  
  -- Check if it's a weekend (Saturday=6, Sunday=0)
  IF check_day_of_week IN (0, 6) THEN
    is_weekend := true;
  END IF;
  
  -- Check if it's a holiday
  SELECT EXISTS(
    SELECT 1 FROM holidays 
    WHERE date = work_date AND is_active = true
  ) INTO is_holiday;
  
  -- Check user's work schedule - use table alias to avoid ambiguity
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
    IF is_weekend THEN
      overtime_reasons := overtime_reasons || ARRAY['weekend'];
    END IF;
    IF is_holiday THEN
      overtime_reasons := overtime_reasons || ARRAY['holiday'];
    END IF;
  ELSE
    -- Regular work day: 8 hours standard, rest is overtime
    regular_hours := LEAST(total_hours, 8);
    overtime_hours := GREATEST(0, total_hours - 8);
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
    'requires_approval', (overtime_hours > 0 AND (is_weekend OR is_holiday))
  );
END;
$$;

-- Also fix the trigger function to handle arrays properly
CREATE OR REPLACE FUNCTION public.update_time_entry_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  calculated_hours JSONB;
  reasons_array TEXT[];
BEGIN
  -- Only calculate if check_out_time is set
  IF NEW.check_out_time IS NOT NULL THEN
    SELECT public.calculate_work_hours(
      NEW.user_id,
      NEW.check_in_time,
      NEW.check_out_time
    ) INTO calculated_hours;
    
    -- Extract the array properly from JSONB
    SELECT ARRAY(SELECT jsonb_array_elements_text(calculated_hours->'overtime_reasons')) INTO reasons_array;
    
    -- Update the calculated fields
    NEW.total_hours := (calculated_hours->>'total_hours')::NUMERIC;
    NEW.regular_hours := (calculated_hours->>'regular_hours')::NUMERIC;
    NEW.overtime_hours := (calculated_hours->>'overtime_hours')::NUMERIC;
    NEW.is_weekend := (calculated_hours->>'is_weekend')::BOOLEAN;
    NEW.is_holiday := (calculated_hours->>'is_holiday')::BOOLEAN;
    NEW.overtime_reason := reasons_array;
    
    -- Set approval status based on overtime type
    IF (calculated_hours->>'requires_approval')::BOOLEAN THEN
      NEW.approval_status := 'pending';
    ELSE
      NEW.approval_status := 'approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;