-- Create function to handle truck status changes with proper Bulgaria timezone
CREATE OR REPLACE FUNCTION public.handle_truck_status_change(
  p_truck_id uuid,
  p_new_status text,
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  truck_record RECORD;
  bulgaria_now TIMESTAMP WITH TIME ZONE := now() AT TIME ZONE 'Europe/Sofia';
BEGIN
  -- Get truck details
  SELECT * INTO truck_record FROM public.trucks WHERE id = p_truck_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Truck not found';
  END IF;

  -- Handle different status changes
  IF p_new_status = 'ARRIVED' THEN
    -- Use the existing handle_truck_arrival function
    RETURN public.handle_truck_arrival(p_truck_id, p_user_id);
    
  ELSIF p_new_status = 'IN_PROGRESS' THEN
    -- Update truck to IN_PROGRESS with Bulgaria timezone
    UPDATE public.trucks 
    SET 
      status = 'IN_PROGRESS',
      handled_by_user_id = p_user_id,
      handled_by_name = (SELECT email FROM auth.users WHERE id = p_user_id),
      started_at = bulgaria_now,
      updated_at = now()
    WHERE id = p_truck_id;
    
    -- Log status change
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, changed_by_user_id, change_reason, metadata
    ) VALUES (
      p_truck_id, 
      truck_record.status,
      'IN_PROGRESS', 
      p_user_id, 
      'Work started',
      jsonb_build_object(
        'started_at_bulgaria', bulgaria_now,
        'timezone', 'Europe/Sofia'
      )
    );
    
  ELSIF p_new_status = 'DONE' THEN
    -- Update truck to DONE with Bulgaria timezone
    UPDATE public.trucks 
    SET 
      status = 'DONE',
      completed_at = bulgaria_now,
      updated_at = now()
    WHERE id = p_truck_id;
    
    -- Log status change
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, changed_by_user_id, change_reason, metadata
    ) VALUES (
      p_truck_id, 
      truck_record.status,
      'DONE', 
      p_user_id, 
      'Work completed',
      jsonb_build_object(
        'completed_at_bulgaria', bulgaria_now,
        'timezone', 'Europe/Sofia'
      )
    );
    
  ELSE
    -- For other status changes, just update the status
    UPDATE public.trucks 
    SET 
      status = p_new_status,
      updated_at = now()
    WHERE id = p_truck_id;
    
    -- Log status change
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, changed_by_user_id, change_reason
    ) VALUES (
      p_truck_id, 
      truck_record.status,
      p_new_status, 
      p_user_id, 
      'Status updated'
    );
  END IF;
  
  RETURN true;
END;
$function$;