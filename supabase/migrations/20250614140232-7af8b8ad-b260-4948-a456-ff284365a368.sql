-- Fix the trigger function to not override approval status when explicitly set
CREATE OR REPLACE FUNCTION public.update_time_entry_hours()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_time_entry_hours_trigger
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_time_entry_hours();