-- Completely drop and recreate the view with explicit security settings
DROP VIEW IF EXISTS public.user_kpi_with_profiles CASCADE;

-- Recreate the view with explicit security settings to ensure no SECURITY DEFINER
CREATE VIEW public.user_kpi_with_profiles 
WITH (security_barrier = false, security_invoker = true)
AS
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

-- Grant appropriate permissions
GRANT SELECT ON public.user_kpi_with_profiles TO authenticated;

-- Verify the view settings
SELECT schemaname, viewname, viewowner, definition 
FROM pg_views 
WHERE viewname = 'user_kpi_with_profiles';