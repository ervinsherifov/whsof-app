-- Check what's happening with the trigger
SELECT 
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'time_entries';

-- Check the trigger function content
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'update_time_entry_hours';