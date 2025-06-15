-- Fix search_path for the remaining functions
-- These functions don't have RLS dependencies and can be safely updated

-- Update refresh_all_kpi_views function
CREATE OR REPLACE FUNCTION public.refresh_all_kpi_views()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Refresh both materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_performance_summary;
  
  -- Log the refresh
  INSERT INTO public.performance_trends (
    date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
  )
  SELECT 
    CURRENT_DATE,
    total_trucks,
    completed_trucks,
    avg_processing_hours,
    0 as total_pallets, -- Will be updated when pallet tracking is enhanced
    0 as avg_efficiency -- Will be calculated when efficiency metrics are added
  FROM public.kpi_dashboard_summary
  WHERE metric_date = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_trucks = EXCLUDED.total_trucks,
    completed_trucks = EXCLUDED.completed_trucks,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    total_pallets = EXCLUDED.total_pallets,
    avg_efficiency = EXCLUDED.avg_efficiency;
    
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error refreshing materialized views: %', SQLERRM;
END;
$function$;

-- Update mark_overdue_trucks function
CREATE OR REPLACE FUNCTION public.mark_overdue_trucks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  overdue_count INTEGER := 0;
  truck_record RECORD;
BEGIN
  -- Find trucks that are scheduled but past their arrival date
  FOR truck_record IN 
    SELECT id, license_plate, arrival_date, arrival_time
    FROM public.trucks 
    WHERE status = 'SCHEDULED' 
      AND is_overdue = false
      AND (arrival_date < CURRENT_DATE 
           OR (arrival_date = CURRENT_DATE AND arrival_time < CURRENT_TIME))
  LOOP
    -- Mark truck as overdue
    UPDATE public.trucks 
    SET 
      is_overdue = true,
      overdue_marked_at = now(),
      original_arrival_date = COALESCE(original_arrival_date, truck_record.arrival_date)
    WHERE id = truck_record.id;
    
    -- Log status change
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, changed_by_system, change_reason
    ) VALUES (
      truck_record.id, 'SCHEDULED', 'OVERDUE', true, 'Automatic overdue detection'
    );
    
    -- Create notification
    INSERT INTO public.truck_notifications (
      truck_id, notification_type, title, message, severity, expires_at
    ) VALUES (
      truck_record.id, 
      'OVERDUE', 
      'Truck Overdue: ' || truck_record.license_plate,
      'Truck ' || truck_record.license_plate || ' was scheduled for ' || 
      truck_record.arrival_date || ' at ' || truck_record.arrival_time || ' but has not arrived.',
      'WARNING',
      now() + INTERVAL '24 hours'
    );
    
    overdue_count := overdue_count + 1;
  END LOOP;
  
  RETURN overdue_count;
END;
$function$;

-- Update reschedule_overdue_truck function
CREATE OR REPLACE FUNCTION public.reschedule_overdue_truck(p_truck_id uuid, p_new_date date, p_new_time time without time zone, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  truck_record RECORD;
BEGIN
  -- Get truck details
  SELECT * INTO truck_record FROM public.trucks WHERE id = p_truck_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Truck not found';
  END IF;
  
  -- Update truck with new schedule
  UPDATE public.trucks 
  SET 
    arrival_date = p_new_date,
    arrival_time = p_new_time,
    is_overdue = false,
    overdue_marked_at = NULL,
    reschedule_count = reschedule_count + 1,
    original_arrival_date = COALESCE(original_arrival_date, truck_record.arrival_date),
    updated_at = now()
  WHERE id = p_truck_id;
  
  -- Log status change
  INSERT INTO public.truck_status_history (
    truck_id, old_status, new_status, changed_by_user_id, change_reason, metadata
  ) VALUES (
    p_truck_id, 
    CASE WHEN truck_record.is_overdue THEN 'OVERDUE' ELSE truck_record.status END,
    'SCHEDULED', 
    p_user_id, 
    COALESCE(p_reason, 'Truck rescheduled'),
    jsonb_build_object(
      'old_date', truck_record.arrival_date,
      'old_time', truck_record.arrival_time,
      'new_date', p_new_date,
      'new_time', p_new_time,
      'reschedule_count', truck_record.reschedule_count + 1
    )
  );
  
  -- Create notification
  INSERT INTO public.truck_notifications (
    truck_id, notification_type, title, message, severity
  ) VALUES (
    p_truck_id, 
    'RESCHEDULED', 
    'Truck Rescheduled: ' || truck_record.license_plate,
    'Truck ' || truck_record.license_plate || ' has been rescheduled from ' || 
    truck_record.arrival_date || ' to ' || p_new_date || ' at ' || p_new_time || 
    CASE WHEN p_reason IS NOT NULL THEN '. Reason: ' || p_reason ELSE '' END,
    'INFO'
  );
  
  RETURN true;
END;
$function$;

-- Update handle_truck_arrival function
CREATE OR REPLACE FUNCTION public.handle_truck_arrival(p_truck_id uuid, p_actual_arrival_date date DEFAULT CURRENT_DATE, p_late_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  truck_record RECORD;
  was_late BOOLEAN := false;
  arrival_type TEXT;
BEGIN
  -- Get truck details
  SELECT * INTO truck_record FROM public.trucks WHERE id = p_truck_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Truck not found';
  END IF;
  
  -- Determine if arrival was late
  was_late := (p_actual_arrival_date > truck_record.arrival_date OR truck_record.is_overdue);
  arrival_type := CASE WHEN was_late THEN 'LATE' ELSE 'ON_TIME' END;
  
  -- Update truck status
  UPDATE public.trucks 
  SET 
    status = 'ARRIVED',
    actual_arrival_date = p_actual_arrival_date,
    is_overdue = false,
    overdue_marked_at = NULL,
    late_arrival_reason = p_late_reason,
    updated_at = now()
  WHERE id = p_truck_id;
  
  -- Log status change
  INSERT INTO public.truck_status_history (
    truck_id, old_status, new_status, changed_by_user_id, change_reason, metadata
  ) VALUES (
    p_truck_id, 
    CASE WHEN truck_record.is_overdue THEN 'OVERDUE' ELSE truck_record.status END,
    'ARRIVED', 
    p_user_id, 
    'Truck arrived ' || arrival_type,
    jsonb_build_object(
      'scheduled_date', truck_record.arrival_date,
      'actual_date', p_actual_arrival_date,
      'was_late', was_late,
      'days_late', CASE WHEN was_late THEN p_actual_arrival_date - truck_record.arrival_date ELSE 0 END,
      'late_reason', p_late_reason
    )
  );
  
  -- Create notification for late arrivals
  IF was_late THEN
    INSERT INTO public.truck_notifications (
      truck_id, notification_type, title, message, severity
    ) VALUES (
      p_truck_id, 
      'LATE_ARRIVAL', 
      'Late Arrival: ' || truck_record.license_plate,
      'Truck ' || truck_record.license_plate || ' arrived late on ' || p_actual_arrival_date || 
      ' (scheduled for ' || truck_record.arrival_date || ')' ||
      CASE WHEN p_late_reason IS NOT NULL THEN '. Reason: ' || p_late_reason ELSE '' END,
      'WARNING'
    );
  END IF;
  
  RETURN true;
END;
$function$;

-- Update get_truck_analytics function
CREATE OR REPLACE FUNCTION public.get_truck_analytics(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result JSONB;
  total_trucks INTEGER;
  overdue_trucks INTEGER;
  late_arrivals INTEGER;
  rescheduled_trucks INTEGER;
  avg_reschedules NUMERIC;
  on_time_percentage NUMERIC;
BEGIN
  -- Get basic metrics
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_overdue THEN 1 END) as overdue,
    COUNT(CASE WHEN actual_arrival_date > arrival_date THEN 1 END) as late,
    COUNT(CASE WHEN reschedule_count > 0 THEN 1 END) as rescheduled,
    AVG(reschedule_count) as avg_reschedule
  INTO total_trucks, overdue_trucks, late_arrivals, rescheduled_trucks, avg_reschedules
  FROM public.trucks 
  WHERE created_at::date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate on-time percentage
  on_time_percentage := CASE 
    WHEN total_trucks > 0 THEN 
      ((total_trucks - late_arrivals - overdue_trucks)::NUMERIC / total_trucks::NUMERIC) * 100 
    ELSE 0 
  END;
  
  result := jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'metrics', jsonb_build_object(
      'total_trucks', total_trucks,
      'overdue_trucks', overdue_trucks,
      'late_arrivals', late_arrivals,
      'rescheduled_trucks', rescheduled_trucks,
      'avg_reschedules_per_truck', ROUND(avg_reschedules, 2),
      'on_time_percentage', ROUND(on_time_percentage, 2)
    ),
    'generated_at', now()
  );
  
  RETURN result;
END;
$function$;

-- Update log_truck_status_change function
CREATE OR REPLACE FUNCTION public.log_truck_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Only log if status actually changed
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, change_reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, 'Status updated'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;