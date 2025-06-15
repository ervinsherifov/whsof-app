-- Fix search_path for validate_task_due_date function
CREATE OR REPLACE FUNCTION public.validate_task_due_date() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Allow NULL due dates
  IF NEW.due_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Convert both dates to the same timezone (UTC) for comparison
  -- Allow due dates from today onwards (not strictly future)
  IF NEW.due_date::date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Due date cannot be in the past. Please select today or a future date.';
  END IF;
  
  RETURN NEW;
END;
$$;