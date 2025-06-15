-- Fix search_path security warnings for functions that can be safely updated
-- Set search_path for all functions to prevent search path injection

-- Update functions that don't have policy dependencies

-- Update refresh_kpi_dashboard function
CREATE OR REPLACE FUNCTION public.refresh_kpi_dashboard()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.kpi_dashboard_summary;
  
  -- Insert daily trend data
  INSERT INTO public.performance_trends (
    date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
  )
  SELECT 
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END),
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0 END),
    SUM(pallet_count),
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL AND pallet_count > 0
      THEN pallet_count::NUMERIC / (EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0) END)
  FROM trucks
  WHERE DATE(updated_at) = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_trucks = EXCLUDED.total_trucks,
    completed_trucks = EXCLUDED.completed_trucks,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    total_pallets = EXCLUDED.total_pallets,
    avg_efficiency = EXCLUDED.avg_efficiency;
END;
$function$;

-- Update check_truck_photo_compliance function
CREATE OR REPLACE FUNCTION public.check_truck_photo_compliance(truck_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  required_cats TEXT[];
  completed_cats TEXT[];
  compliance_score NUMERIC;
  is_compliant BOOLEAN;
  photo_count INTEGER;
  result JSONB;
BEGIN
  -- Get required categories
  SELECT ARRAY_AGG(name) INTO required_cats
  FROM photo_categories 
  WHERE is_required = true AND is_active = true;
  
  -- Get completed categories for this truck
  SELECT ARRAY_AGG(DISTINCT pc.name) INTO completed_cats
  FROM truck_completion_photos tcp
  JOIN photo_categories pc ON tcp.category_id = pc.id
  WHERE tcp.truck_id = truck_id_param 
    AND tcp.is_deleted = false;
  
  -- Count total photos
  SELECT COUNT(*) INTO photo_count
  FROM truck_completion_photos
  WHERE truck_id = truck_id_param AND is_deleted = false;
  
  -- Calculate compliance score
  IF required_cats IS NULL OR array_length(required_cats, 1) = 0 THEN
    compliance_score := 100;
    is_compliant := true;
  ELSE
    compliance_score := (
      COALESCE(array_length(completed_cats, 1), 0)::NUMERIC / 
      array_length(required_cats, 1)::NUMERIC
    ) * 100;
    is_compliant := compliance_score >= 100;
  END IF;
  
  -- Update or insert compliance record
  INSERT INTO truck_photo_compliance (
    truck_id, required_categories, completed_categories, 
    compliance_score, is_compliant
  )
  VALUES (
    truck_id_param, required_cats, COALESCE(completed_cats, '{}'), 
    compliance_score, is_compliant
  )
  ON CONFLICT (truck_id) DO UPDATE SET
    required_categories = EXCLUDED.required_categories,
    completed_categories = EXCLUDED.completed_categories,
    compliance_score = EXCLUDED.compliance_score,
    is_compliant = EXCLUDED.is_compliant,
    updated_at = now();
  
  -- Return result
  result := jsonb_build_object(
    'truck_id', truck_id_param,
    'required_categories', required_cats,
    'completed_categories', COALESCE(completed_cats, '{}'),
    'compliance_score', compliance_score,
    'is_compliant', is_compliant,
    'photo_count', photo_count
  );
  
  RETURN result;
END;
$function$;

-- Update generate_truck_photo_summary function
CREATE OR REPLACE FUNCTION public.generate_truck_photo_summary(truck_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  summary JSONB;
  total_photos INTEGER;
  photos_by_category JSONB;
  avg_quality NUMERIC;
  compliance_info JSONB;
BEGIN
  -- Get total photo count
  SELECT COUNT(*) INTO total_photos
  FROM truck_completion_photos
  WHERE truck_id = truck_id_param AND is_deleted = false;
  
  -- Get photos by category
  SELECT jsonb_object_agg(
    COALESCE(pc.name, 'uncategorized'), 
    category_data.photo_count
  ) INTO photos_by_category
  FROM (
    SELECT 
      category_id,
      COUNT(*) as photo_count
    FROM truck_completion_photos
    WHERE truck_id = truck_id_param AND is_deleted = false
    GROUP BY category_id
  ) category_data
  LEFT JOIN photo_categories pc ON category_data.category_id = pc.id;
  
  -- Get average quality score
  SELECT AVG(pqm.quality_score) INTO avg_quality
  FROM truck_completion_photos tcp
  JOIN photo_quality_metrics pqm ON tcp.id = pqm.photo_id
  WHERE tcp.truck_id = truck_id_param AND tcp.is_deleted = false;
  
  -- Get compliance info
  SELECT public.check_truck_photo_compliance(truck_id_param) INTO compliance_info;
  
  -- Build summary
  summary := jsonb_build_object(
    'truck_id', truck_id_param,
    'total_photos', total_photos,
    'photos_by_category', COALESCE(photos_by_category, '{}'),
    'average_quality_score', avg_quality,
    'compliance', compliance_info,
    'generated_at', now()
  );
  
  RETURN summary;
END;
$function$;

-- Update update_photo_compliance_trigger function
CREATE OR REPLACE FUNCTION public.update_photo_compliance_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Update compliance for the affected truck
  IF TG_OP = 'DELETE' THEN
    PERFORM public.check_truck_photo_compliance(OLD.truck_id);
    RETURN OLD;
  ELSE
    PERFORM public.check_truck_photo_compliance(NEW.truck_id);
    RETURN NEW;
  END IF;
END;
$function$;

-- Update update_time_entry_hours function
CREATE OR REPLACE FUNCTION public.update_time_entry_hours()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  calculated_hours JSONB;
  reasons_array TEXT[];
  old_approval_status TEXT;
BEGIN
  -- Store the old approval status
  old_approval_status := OLD.approval_status;
  
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
    
    -- Only set approval status if it wasn't explicitly changed by an admin
    -- If the approval_status was changed from the old value, keep the new value
    IF NEW.approval_status = old_approval_status THEN
      -- Set approval status based on overtime type only if not manually changed
      IF (calculated_hours->>'requires_approval')::BOOLEAN THEN
        NEW.approval_status := 'pending';
      ELSE
        NEW.approval_status := 'approved';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update calculate_work_hours function
CREATE OR REPLACE FUNCTION public.calculate_work_hours(p_user_id uuid, p_check_in_time timestamp with time zone, p_check_out_time timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  total_hours NUMERIC;
  regular_hours NUMERIC := 0;
  overtime_hours NUMERIC := 0;
  work_date DATE;
  check_day_of_week INTEGER;
  is_holiday BOOLEAN := false;
  is_weekend BOOLEAN := false;
  is_working_day BOOLEAN := true;
  overtime_reasons TEXT[] := ARRAY[]::TEXT[];
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
    IF is_weekend THEN
      overtime_reasons := overtime_reasons || ARRAY['weekend'];
    END IF;
    IF is_holiday THEN
      overtime_reasons := overtime_reasons || ARRAY['holiday'];
    END IF;
  ELSE
    -- Regular work day: 9 hours standard (changed from 8), rest is overtime
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
    'requires_approval', (overtime_hours > 0 AND (is_weekend OR is_holiday))
  );
END;
$function$;