-- Fix the security definer issue by recreating the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_kpi_with_profiles;

-- Recreate the view without SECURITY DEFINER to respect RLS policies
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