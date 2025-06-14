-- Add missing pallet-related metrics to user_kpi_metrics table
ALTER TABLE public.user_kpi_metrics 
ADD COLUMN IF NOT EXISTS total_pallets_handled bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_pallets_per_truck numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_unloading_speed_pallets_per_hour numeric DEFAULT 0;

-- Create index for better performance on user_kpi_metrics queries
CREATE INDEX IF NOT EXISTS idx_user_kpi_metrics_user_date ON public.user_kpi_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_user_kpi_metrics_date ON public.user_kpi_metrics(metric_date);

-- Update the refresh function to include pallet metrics
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  -- Delete existing metrics for the target date
  DELETE FROM public.user_kpi_metrics WHERE metric_date = target_date;
  
  -- Insert refreshed metrics including pallet data
  INSERT INTO public.user_kpi_metrics (
    user_id,
    metric_date,
    total_trucks_handled,
    completed_trucks,
    avg_processing_hours,
    tasks_completed,
    exceptions_reported,
    exceptions_resolved,
    total_pallets_handled,
    avg_pallets_per_truck,
    avg_unloading_speed_pallets_per_hour
  )
  SELECT 
    users.user_id,
    target_date as metric_date,
    COUNT(DISTINCT CASE WHEN t.handled_by_user_id IS NOT NULL THEN t.id END) as total_trucks_handled,
    COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' AND t.handled_by_user_id IS NOT NULL THEN t.id END) as completed_trucks,
    AVG(CASE 
      WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600.0 
    END) as avg_processing_hours,
    COUNT(DISTINCT CASE WHEN ta.completed_by_user_id IS NOT NULL THEN ta.id END) as tasks_completed,
    COUNT(DISTINCT CASE WHEN te.reported_by_user_id IS NOT NULL THEN te.id END) as exceptions_reported,
    COUNT(DISTINCT CASE WHEN ex.resolved_by_user_id IS NOT NULL THEN ex.id END) as exceptions_resolved,
    SUM(CASE WHEN t.handled_by_user_id IS NOT NULL THEN t.pallet_count ELSE 0 END) as total_pallets_handled,
    AVG(CASE WHEN t.handled_by_user_id IS NOT NULL THEN t.pallet_count::numeric END) as avg_pallets_per_truck,
    CASE 
      WHEN AVG(CASE 
        WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600.0 
      END) > 0 
      THEN AVG(CASE WHEN t.handled_by_user_id IS NOT NULL THEN t.pallet_count::numeric END) / 
           AVG(CASE 
             WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600.0 
           END)
      ELSE 0 
    END as avg_unloading_speed_pallets_per_hour
  FROM (
    SELECT DISTINCT 
      COALESCE(trucks.handled_by_user_id, tasks.completed_by_user_id, exceptions.reported_by_user_id, exceptions.resolved_by_user_id) as user_id
    FROM public.trucks
    FULL OUTER JOIN public.tasks ON trucks.id = tasks.truck_id
    FULL OUTER JOIN public.truck_exceptions exceptions ON trucks.id = exceptions.truck_id
    WHERE COALESCE(trucks.handled_by_user_id, tasks.completed_by_user_id, exceptions.reported_by_user_id, exceptions.resolved_by_user_id) IS NOT NULL
      AND (
        DATE(trucks.updated_at) = target_date OR 
        DATE(tasks.updated_at) = target_date OR 
        DATE(exceptions.updated_at) = target_date
      )
  ) users
  LEFT JOIN public.trucks t ON t.handled_by_user_id = users.user_id AND DATE(t.updated_at) = target_date
  LEFT JOIN public.tasks ta ON ta.completed_by_user_id = users.user_id AND DATE(ta.updated_at) = target_date
  LEFT JOIN public.truck_exceptions te ON te.reported_by_user_id = users.user_id AND DATE(te.updated_at) = target_date
  LEFT JOIN public.truck_exceptions ex ON ex.resolved_by_user_id = users.user_id AND DATE(ex.updated_at) = target_date
  GROUP BY users.user_id, target_date
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh today's data with new metrics
SELECT public.refresh_user_kpi_metrics(CURRENT_DATE);