-- Drop both views that depend on the columns
DROP MATERIALIZED VIEW IF EXISTS public.user_performance_summary;
DROP VIEW IF EXISTS public.user_kpi_with_profiles;

-- Fix column types to properly store fractional values
ALTER TABLE public.user_kpi_metrics 
ALTER COLUMN total_trucks_handled TYPE NUMERIC,
ALTER COLUMN completed_trucks TYPE NUMERIC;

-- Recreate the view user_kpi_with_profiles (avoid column conflicts)
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
JOIN profiles p ON ukm.user_id = p.user_id;

-- Recreate the materialized view with updated column types
CREATE MATERIALIZED VIEW public.user_performance_summary AS
SELECT 
  ukm.user_id,
  p.display_name,
  p.email,
  SUM(ukm.total_trucks_handled) as total_trucks_handled,
  SUM(ukm.completed_trucks) as completed_trucks,
  AVG(ukm.avg_processing_hours) as avg_processing_hours,
  SUM(ukm.tasks_completed) as tasks_completed,
  SUM(ukm.exceptions_reported) as exceptions_reported,
  SUM(ukm.exceptions_resolved) as exceptions_resolved,
  SUM(ukm.total_pallets_handled) as total_pallets_handled,
  AVG(ukm.avg_pallets_per_truck) as avg_pallets_per_truck,
  AVG(ukm.avg_unloading_speed_pallets_per_hour) as avg_unloading_speed_pallets_per_hour,
  COUNT(DISTINCT ukm.metric_date) as active_days,
  MAX(ukm.metric_date) as last_activity_date
FROM user_kpi_metrics ukm
JOIN profiles p ON ukm.user_id = p.user_id
WHERE ukm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ukm.user_id, p.display_name, p.email;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON public.user_performance_summary (user_id);

-- Refresh the data with correct decimal storage
SELECT public.refresh_user_kpi_metrics(CURRENT_DATE);