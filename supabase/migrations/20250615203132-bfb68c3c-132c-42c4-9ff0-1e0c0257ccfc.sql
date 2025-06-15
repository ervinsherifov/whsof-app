-- Fix the duplicate counting issue by ensuring proper fractional truck credit
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete existing metrics for the target date
  DELETE FROM public.user_kpi_metrics WHERE metric_date = target_date;
  
  -- Insert refreshed metrics with proper fractional truck and pallet division
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
    -- Count trucks where user worked, divided by total handlers per truck
    SUM(CASE 
      WHEN user_trucks.truck_id IS NOT NULL THEN 
        1.0 / user_trucks.total_handlers
      ELSE 0 
    END) as total_trucks_handled,
    -- Count completed trucks where user worked, divided by total handlers per truck
    SUM(CASE 
      WHEN user_trucks.truck_id IS NOT NULL AND user_trucks.truck_status IN ('COMPLETED', 'DONE') THEN 
        1.0 / user_trucks.total_handlers
      ELSE 0 
    END) as completed_trucks,
    AVG(CASE 
      WHEN user_trucks.truck_id IS NOT NULL AND user_trucks.completed_at IS NOT NULL AND user_trucks.started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (user_trucks.completed_at - user_trucks.started_at)) / 3600.0 
    END) as avg_processing_hours,
    COUNT(DISTINCT CASE WHEN ta.completed_by_user_id IS NOT NULL THEN ta.id END) as tasks_completed,
    COUNT(DISTINCT CASE WHEN te.reported_by_user_id IS NOT NULL THEN te.id END) as exceptions_reported,
    COUNT(DISTINCT CASE WHEN ex.resolved_by_user_id IS NOT NULL THEN ex.id END) as exceptions_resolved,
    -- Pallets divided by total handlers per truck
    SUM(CASE 
      WHEN user_trucks.truck_id IS NOT NULL THEN 
        user_trucks.pallet_count::NUMERIC / user_trucks.total_handlers
      ELSE 0 
    END) as total_pallets_handled,
    AVG(CASE 
      WHEN user_trucks.truck_id IS NOT NULL THEN 
        user_trucks.pallet_count::NUMERIC / user_trucks.total_handlers
      ELSE NULL 
    END) as avg_pallets_per_truck,
    CASE 
      WHEN AVG(CASE 
        WHEN user_trucks.truck_id IS NOT NULL AND user_trucks.completed_at IS NOT NULL AND user_trucks.started_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (user_trucks.completed_at - user_trucks.started_at)) / 3600.0 
      END) > 0 
      THEN AVG(CASE 
        WHEN user_trucks.truck_id IS NOT NULL THEN 
          user_trucks.pallet_count::NUMERIC / user_trucks.total_handlers
        ELSE NULL 
      END) / AVG(CASE 
        WHEN user_trucks.truck_id IS NOT NULL AND user_trucks.completed_at IS NOT NULL AND user_trucks.started_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (user_trucks.completed_at - user_trucks.started_at)) / 3600.0 
      END)
      ELSE 0 
    END as avg_unloading_speed_pallets_per_hour
  FROM (
    -- Get ALL users who worked on trucks
    SELECT DISTINCT user_id FROM (
      SELECT handled_by_user_id as user_id FROM public.trucks 
      WHERE handled_by_user_id IS NOT NULL AND DATE(updated_at) = target_date
      UNION
      SELECT handler_user_id as user_id FROM public.truck_handlers 
      WHERE DATE(created_at) = target_date
      UNION
      SELECT completed_by_user_id as user_id FROM public.tasks 
      WHERE completed_by_user_id IS NOT NULL AND DATE(updated_at) = target_date
      UNION
      SELECT reported_by_user_id as user_id FROM public.truck_exceptions 
      WHERE reported_by_user_id IS NOT NULL AND DATE(updated_at) = target_date
      UNION
      SELECT resolved_by_user_id as user_id FROM public.truck_exceptions 
      WHERE resolved_by_user_id IS NOT NULL AND DATE(updated_at) = target_date
    ) all_users
  ) users
  LEFT JOIN (
    -- Get trucks each user worked on with handler count
    SELECT DISTINCT
      user_id,
      truck_id,
      truck_status,
      pallet_count,
      started_at,
      completed_at,
      total_handlers
    FROM (
      SELECT 
        t.handled_by_user_id as user_id,
        t.id as truck_id,
        t.status as truck_status,
        t.pallet_count,
        t.started_at,
        t.completed_at,
        (SELECT COUNT(*) FROM (
          SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
          UNION
          SELECT th.handler_user_id as user_id FROM truck_handlers th WHERE th.truck_id = t.id
        ) handlers) as total_handlers
      FROM public.trucks t
      WHERE t.handled_by_user_id IS NOT NULL AND DATE(t.updated_at) = target_date
      
      UNION
      
      SELECT 
        th.handler_user_id as user_id,
        t.id as truck_id,
        t.status as truck_status,
        t.pallet_count,
        t.started_at,
        t.completed_at,
        (SELECT COUNT(*) FROM (
          SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
          UNION
          SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
        ) handlers) as total_handlers
      FROM public.truck_handlers th
      JOIN public.trucks t ON th.truck_id = t.id
      WHERE DATE(th.created_at) = target_date
    ) user_truck_data
  ) user_trucks ON user_trucks.user_id = users.user_id
  LEFT JOIN public.tasks ta ON ta.completed_by_user_id = users.user_id AND DATE(ta.updated_at) = target_date
  LEFT JOIN public.truck_exceptions te ON te.reported_by_user_id = users.user_id AND DATE(te.updated_at) = target_date
  LEFT JOIN public.truck_exceptions ex ON ex.resolved_by_user_id = users.user_id AND DATE(ex.updated_at) = target_date
  GROUP BY users.user_id, target_date;
END;
$$;

-- Refresh the KPI data with correct fractional truck counting
SELECT public.refresh_user_kpi_metrics(CURRENT_DATE);