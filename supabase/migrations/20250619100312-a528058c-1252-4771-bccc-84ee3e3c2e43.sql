-- Update other time-sensitive functions to use Bulgaria timezone

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
  bulgaria_date DATE := (now() AT TIME ZONE 'Europe/Sofia')::DATE;
  bulgaria_time TIME := (now() AT TIME ZONE 'Europe/Sofia')::TIME;
BEGIN
  -- Find trucks that are scheduled but past their arrival date (using Bulgaria time)
  FOR truck_record IN 
    SELECT id, license_plate, arrival_date, arrival_time
    FROM public.trucks 
    WHERE status = 'SCHEDULED' 
      AND is_overdue = false
      AND (arrival_date < bulgaria_date 
           OR (arrival_date = bulgaria_date AND arrival_time < bulgaria_time))
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
      truck_id, old_status, new_status, changed_by_system, change_reason, metadata
    ) VALUES (
      truck_record.id, 'SCHEDULED', 'OVERDUE', true, 'Automatic overdue detection (Bulgaria time)',
      jsonb_build_object(
        'timezone', 'Europe/Sofia',
        'detection_date', bulgaria_date,
        'detection_time', bulgaria_time
      )
    );
    
    -- Create notification
    INSERT INTO public.truck_notifications (
      truck_id, notification_type, title, message, severity, expires_at
    ) VALUES (
      truck_record.id, 
      'OVERDUE', 
      'Truck Overdue: ' || truck_record.license_plate,
      'Truck ' || truck_record.license_plate || ' was scheduled for ' || 
      truck_record.arrival_date || ' at ' || truck_record.arrival_time || ' but has not arrived (Bulgaria time).',
      'WARNING',
      now() + INTERVAL '24 hours'
    );
    
    overdue_count := overdue_count + 1;
  END LOOP;
  
  RETURN overdue_count;
END;
$function$;