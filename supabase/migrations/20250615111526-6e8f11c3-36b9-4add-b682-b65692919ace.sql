-- CRITICAL SECURITY FIX: Remove SECURITY DEFINER from views
-- These views should NOT have SECURITY DEFINER as it bypasses RLS policies

-- Drop and recreate kpi_metrics view without SECURITY DEFINER
DROP VIEW IF EXISTS public.kpi_metrics;

CREATE VIEW public.kpi_metrics AS
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

-- Drop and recreate user_kpi_with_profiles view without SECURITY DEFINER  
DROP VIEW IF EXISTS public.user_kpi_with_profiles;

CREATE VIEW public.user_kpi_with_profiles AS
SELECT 
  ukm.id,
  ukm.user_id,
  ukm.metric_date,
  ukm.total_trucks_handled,
  ukm.completed_trucks,
  ukm.avg_processing_hours,
  ukm.tasks_completed,
  ukm.exceptions_reported,
  ukm.exceptions_resolved,
  ukm.total_pallets_handled,
  ukm.avg_pallets_per_truck,
  ukm.avg_unloading_speed_pallets_per_hour,
  ukm.created_at,
  ukm.updated_at,
  p.display_name,
  p.email
FROM user_kpi_metrics ukm
LEFT JOIN profiles p ON ukm.user_id = p.user_id;