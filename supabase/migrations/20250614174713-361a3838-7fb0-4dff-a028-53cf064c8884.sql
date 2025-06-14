-- Enhanced KPI Performance with Materialized Views
-- Replace the existing materialized view with an optimized version

DROP MATERIALIZED VIEW IF EXISTS public.kpi_dashboard_summary;

-- Create an optimized materialized view for KPI data
CREATE MATERIALIZED VIEW public.kpi_dashboard_summary AS
SELECT 
  -- Essential metrics only
  COUNT(*) as total_trucks,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_trucks,
  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_trucks,
  COUNT(CASE WHEN status = 'ARRIVED' THEN 1 END) as arrived_trucks,
  COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduled_trucks,
  
  -- Priority breakdown
  COUNT(CASE WHEN priority = 'URGENT' THEN 1 END) as urgent_trucks,
  COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority_trucks,
  
  -- Processing metrics
  AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0 END) as avg_processing_hours,
  
  -- Exception counts
  (SELECT COUNT(*) FROM truck_exceptions WHERE status = 'PENDING') as pending_exceptions,
  (SELECT COUNT(*) FROM truck_exceptions WHERE status = 'RESOLVED') as resolved_exceptions,
  
  -- Time-based data
  CURRENT_DATE as metric_date,
  now() as last_updated
FROM trucks
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'; -- Only last 30 days for performance

-- Create unique index for faster refresh
CREATE UNIQUE INDEX idx_kpi_summary_date ON public.kpi_dashboard_summary (metric_date);

-- Create optimized aggregated user metrics view
CREATE MATERIALIZED VIEW public.user_performance_summary AS
SELECT 
  ukm.user_id,
  p.display_name,
  p.email,
  -- Working hours aggregation (last 7 days)
  SUM(ukm.total_trucks_handled * COALESCE(ukm.avg_processing_hours, 0)) as total_working_hours,
  -- Estimate overtime (20% of total hours as per current logic)
  SUM(ukm.total_trucks_handled * COALESCE(ukm.avg_processing_hours, 0)) * 0.2 as total_overtime_hours,
  SUM(ukm.tasks_completed) as total_tasks_completed,
  SUM(ukm.completed_trucks) as total_trucks_completed,
  AVG(ukm.avg_processing_hours) as avg_processing_hours,
  COUNT(ukm.metric_date) as active_days,
  MAX(ukm.metric_date) as last_activity_date
FROM user_kpi_metrics ukm
JOIN profiles p ON ukm.user_id = p.user_id
WHERE ukm.metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ukm.user_id, p.display_name, p.email;

-- Create index for user performance view
CREATE UNIQUE INDEX idx_user_performance_user ON public.user_performance_summary (user_id);

-- Enhanced refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_all_kpi_views()
RETURNS void AS $$
BEGIN
  -- Refresh both materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_performance_summary;
  
  -- Log the refresh
  INSERT INTO public.performance_trends (
    date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
  )
  SELECT 
    CURRENT_DATE,
    total_trucks,
    completed_trucks,
    avg_processing_hours,
    0 as total_pallets, -- Will be updated when pallet tracking is enhanced
    0 as avg_efficiency -- Will be calculated when efficiency metrics are added
  FROM public.kpi_dashboard_summary
  WHERE metric_date = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_trucks = EXCLUDED.total_trucks,
    completed_trucks = EXCLUDED.completed_trucks,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    total_pallets = EXCLUDED.total_pallets,
    avg_efficiency = EXCLUDED.avg_efficiency;
    
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error refreshing materialized views: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Update the cron job to use the new function
SELECT cron.unschedule('refresh-kpi-dashboard');
SELECT cron.schedule(
  'refresh-all-kpi-views',
  '*/15 * * * *', -- Every 15 minutes instead of hourly for better responsiveness
  'SELECT refresh_all_kpi_views();'
);