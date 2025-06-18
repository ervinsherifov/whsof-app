-- Explicit SECURITY INVOKER fix for user_kpi_with_profiles view
-- Use explicit security_invoker = on to ensure no SECURITY DEFINER

-- Drop the existing view completely
DROP VIEW IF EXISTS public.user_kpi_with_profiles CASCADE;

-- Recreate the view with explicit SECURITY INVOKER setting
CREATE OR REPLACE VIEW public.user_kpi_with_profiles
WITH (security_invoker = on) AS
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

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.user_kpi_with_profiles TO authenticated;

-- Verify the view is created with SECURITY INVOKER
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'user_kpi_with_profiles';