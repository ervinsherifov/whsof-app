-- Disable the trigger temporarily to test
DROP TRIGGER IF EXISTS update_time_entry_hours_trigger ON public.time_entries;

-- Test manual update to see if it works without trigger
UPDATE public.time_entries 
SET approval_status = 'approved'
WHERE id = '24131b1c-027f-4541-88c3-c10fa20b933e'
RETURNING id, approval_status, approved_by_user_id;