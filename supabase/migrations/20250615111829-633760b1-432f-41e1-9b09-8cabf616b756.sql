-- Force complete refresh of the kpi_metrics view to clear any cached SECURITY DEFINER
DROP VIEW IF EXISTS public.kpi_metrics CASCADE;

-- Recreate the view with explicit SECURITY INVOKER (opposite of SECURITY DEFINER)
CREATE VIEW public.kpi_metrics 
WITH (security_invoker=true) AS
SELECT 
  CURRENT_DATE as metric_date,
  COUNT(*) as total_trucks,
  COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduled_trucks,
  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_trucks,
  COUNT(CASE WHEN status = 'ARRIVED' THEN 1 END) as arrived_trucks,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_trucks,
  AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0 END) as avg_processing_hours,
  COUNT(CASE WHEN priority = 'LOW' THEN 1 END) as low_priority_trucks,
  COUNT(CASE WHEN priority = 'NORMAL' THEN 1 END) as normal_priority_trucks,
  COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority_trucks,
  COUNT(CASE WHEN priority = 'URGENT' THEN 1 END) as urgent_trucks,
  (SELECT COUNT(*) FROM truck_exceptions WHERE status = 'PENDING') as pending_exceptions,
  (SELECT COUNT(*) FROM truck_exceptions WHERE status = 'RESOLVED') as resolved_exceptions
FROM trucks
WHERE DATE(updated_at) = CURRENT_DATE;