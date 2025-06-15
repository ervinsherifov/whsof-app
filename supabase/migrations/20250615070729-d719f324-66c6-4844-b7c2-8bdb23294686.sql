-- Fix timezone issue for task due date validation
-- Remove any existing check constraints that might be causing timezone issues
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_due_date_check;

-- Create a function to properly handle timezone validation for due dates
CREATE OR REPLACE FUNCTION validate_task_due_date() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for task due date validation
DROP TRIGGER IF EXISTS validate_task_due_date_trigger ON public.tasks;
CREATE TRIGGER validate_task_due_date_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_due_date();