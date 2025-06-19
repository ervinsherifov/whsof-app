-- Fix function ambiguity by dropping old versions and creating a single, comprehensive handle_truck_arrival function
-- This resolves the "could not choose the best candidate function" error

-- Drop any existing versions of handle_truck_arrival function
DROP FUNCTION IF EXISTS public.handle_truck_arrival(uuid, uuid);
DROP FUNCTION IF EXISTS public.handle_truck_arrival(uuid, date, text, uuid);
DROP FUNCTION IF EXISTS public.handle_truck_arrival(uuid, uuid, uuid);

-- Create the definitive handle_truck_arrival function with all needed functionality
CREATE OR REPLACE FUNCTION public.handle_truck_arrival(
  p_truck_id uuid, 
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  truck_record RECORD;
  was_late BOOLEAN := false;
  arrival_type TEXT;
  actual_arrival_date DATE := CURRENT_DATE;
  actual_arrival_time TIME := CURRENT_TIME;
BEGIN
  -- Get truck details
  SELECT * INTO truck_record FROM public.trucks WHERE id = p_truck_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Truck not found';
  END IF;
  
  -- Determine if arrival was late (compare with scheduled date/time)
  was_late := (actual_arrival_date > truck_record.arrival_date) OR 
              (actual_arrival_date = truck_record.arrival_date AND actual_arrival_time > truck_record.arrival_time) OR 
              truck_record.is_overdue;
  arrival_type := CASE WHEN was_late THEN 'LATE' ELSE 'ON_TIME' END;
  
  -- Update truck status with actual arrival date and time
  UPDATE public.trucks 
  SET 
    status = 'ARRIVED',
    actual_arrival_date = actual_arrival_date,
    actual_arrival_time = actual_arrival_time,
    is_overdue = false,
    overdue_marked_at = NULL,
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
      'scheduled_time', truck_record.arrival_time,
      'actual_date', actual_arrival_date,
      'actual_time', actual_arrival_time,
      'was_late', was_late
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
      'Truck ' || truck_record.license_plate || ' arrived late. Scheduled: ' || 
      truck_record.arrival_date || ' ' || truck_record.arrival_time || 
      ', Actual: ' || actual_arrival_date || ' ' || actual_arrival_time,
      'WARNING'
    );
  END IF;
  
  RETURN true;
END;
$function$;