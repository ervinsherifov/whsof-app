-- Update the KPI functions to handle helpers and pallet division properly
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete existing metrics for the target date
  DELETE FROM public.user_kpi_metrics WHERE metric_date = target_date;
  
  -- Insert refreshed metrics including proper pallet division with helpers
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
    COUNT(DISTINCT CASE WHEN (t.handled_by_user_id IS NOT NULL OR th.handler_user_id IS NOT NULL) THEN t.id END) as total_trucks_handled,
    COUNT(DISTINCT CASE WHEN (t.status = 'COMPLETED' OR t.status = 'DONE') AND (t.handled_by_user_id IS NOT NULL OR th.handler_user_id IS NOT NULL) THEN t.id END) as completed_trucks,
    AVG(CASE 
      WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600.0 
    END) as avg_processing_hours,
    COUNT(DISTINCT CASE WHEN ta.completed_by_user_id IS NOT NULL THEN ta.id END) as tasks_completed,
    COUNT(DISTINCT CASE WHEN te.reported_by_user_id IS NOT NULL THEN te.id END) as exceptions_reported,
    COUNT(DISTINCT CASE WHEN ex.resolved_by_user_id IS NOT NULL THEN ex.id END) as exceptions_resolved,
    -- Calculate pallets with helper division
    SUM(CASE 
      WHEN th.handler_user_id IS NOT NULL THEN 
        -- If user worked with helpers, divide pallets by number of handlers
        t.pallet_count::NUMERIC / (
          SELECT COUNT(*) FROM truck_handlers th2 WHERE th2.truck_id = t.id
        )
      WHEN t.handled_by_user_id IS NOT NULL THEN 
        -- If user worked alone, they get all pallets
        t.pallet_count::NUMERIC
      ELSE 0 
    END) as total_pallets_handled,
    AVG(CASE 
      WHEN th.handler_user_id IS NOT NULL THEN 
        -- Average pallets per truck with helper division
        t.pallet_count::NUMERIC / (
          SELECT COUNT(*) FROM truck_handlers th2 WHERE th2.truck_id = t.id
        )
      WHEN t.handled_by_user_id IS NOT NULL THEN 
        t.pallet_count::NUMERIC
      ELSE NULL 
    END) as avg_pallets_per_truck,
    CASE 
      WHEN AVG(CASE 
        WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600.0 
      END) > 0 
      THEN AVG(CASE 
        WHEN th.handler_user_id IS NOT NULL THEN 
          t.pallet_count::NUMERIC / (
            SELECT COUNT(*) FROM truck_handlers th2 WHERE th2.truck_id = t.id
          )
        WHEN t.handled_by_user_id IS NOT NULL THEN 
          t.pallet_count::NUMERIC
        ELSE NULL 
      END) / AVG(CASE 
        WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600.0 
      END)
      ELSE 0 
    END as avg_unloading_speed_pallets_per_hour
  FROM (
    SELECT DISTINCT 
      COALESCE(
        trucks.handled_by_user_id, 
        truck_handlers.handler_user_id,
        tasks.completed_by_user_id, 
        exceptions.reported_by_user_id, 
        exceptions.resolved_by_user_id
      ) as user_id
    FROM public.trucks
    FULL OUTER JOIN public.truck_handlers ON trucks.id = truck_handlers.truck_id
    FULL OUTER JOIN public.tasks ON trucks.id = tasks.truck_id
    FULL OUTER JOIN public.truck_exceptions exceptions ON trucks.id = exceptions.truck_id
    WHERE COALESCE(
      trucks.handled_by_user_id, 
      truck_handlers.handler_user_id,
      tasks.completed_by_user_id, 
      exceptions.reported_by_user_id, 
      exceptions.resolved_by_user_id
    ) IS NOT NULL
    AND (
      DATE(trucks.updated_at) = target_date OR 
      DATE(truck_handlers.created_at) = target_date OR
      DATE(tasks.updated_at) = target_date OR 
      DATE(exceptions.updated_at) = target_date
    )
  ) users
  LEFT JOIN public.trucks t ON (t.handled_by_user_id = users.user_id OR EXISTS(
    SELECT 1 FROM truck_handlers th_check 
    WHERE th_check.truck_id = t.id AND th_check.handler_user_id = users.user_id
  )) AND DATE(t.updated_at) = target_date
  LEFT JOIN public.truck_handlers th ON th.truck_id = t.id AND th.handler_user_id = users.user_id
  LEFT JOIN public.tasks ta ON ta.completed_by_user_id = users.user_id AND DATE(ta.updated_at) = target_date
  LEFT JOIN public.truck_exceptions te ON te.reported_by_user_id = users.user_id AND DATE(te.updated_at) = target_date
  LEFT JOIN public.truck_exceptions ex ON ex.resolved_by_user_id = users.user_id AND DATE(ex.updated_at) = target_date
  GROUP BY users.user_id, target_date
  HAVING COUNT(*) > 0;
END;
$$;

-- Fix the performance trends refresh function
CREATE OR REPLACE FUNCTION public.refresh_all_kpi_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh user KPI metrics first
  PERFORM public.refresh_user_kpi_metrics(CURRENT_DATE);
  
  -- Refresh both materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_performance_summary;
  
  -- Log the refresh with proper trend data including DONE status
  INSERT INTO public.performance_trends (
    date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
  )
  SELECT 
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN status = 'COMPLETED' OR status = 'DONE' THEN 1 END),
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0 END),
    SUM(pallet_count),
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL AND pallet_count > 0
      THEN pallet_count::NUMERIC / (EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0) END)
  FROM trucks
  WHERE DATE(updated_at) = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_trucks = EXCLUDED.total_trucks,
    completed_trucks = EXCLUDED.completed_trucks,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    total_pallets = EXCLUDED.total_pallets,
    avg_efficiency = EXCLUDED.avg_efficiency,
    created_at = now();
    
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error refreshing materialized views: %', SQLERRM;
END;
$$;

-- Also update the materialized view to include DONE status
DROP MATERIALIZED VIEW IF EXISTS public.kpi_dashboard_summary CASCADE;

CREATE MATERIALIZED VIEW public.kpi_dashboard_summary AS
SELECT 
  -- Essential metrics only
  COUNT(*) as total_trucks,
  COUNT(CASE WHEN status = 'COMPLETED' OR status = 'DONE' THEN 1 END) as completed_trucks,
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
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Create unique index for faster refresh
CREATE UNIQUE INDEX idx_kpi_summary_date ON public.kpi_dashboard_summary (metric_date);

-- Force refresh everything now
SELECT public.refresh_all_kpi_views();