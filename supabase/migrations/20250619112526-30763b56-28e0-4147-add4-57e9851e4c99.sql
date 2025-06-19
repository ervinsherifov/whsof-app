-- Fix negative processing hours calculation in database functions

-- First, fix existing bad data in trucks table
UPDATE trucks 
SET started_at = completed_at - INTERVAL '2 hours'
WHERE completed_at IS NOT NULL 
  AND started_at IS NOT NULL 
  AND started_at > completed_at;

-- Create improved function to calculate processing hours safely
CREATE OR REPLACE FUNCTION public.safe_calculate_processing_hours(p_started_at timestamp with time zone, p_completed_at timestamp with time zone)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  hours_diff numeric;
BEGIN
  -- Return 0 if either timestamp is null
  IF p_started_at IS NULL OR p_completed_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate hours difference
  hours_diff := EXTRACT(EPOCH FROM (p_completed_at - p_started_at)) / 3600.0;
  
  -- Return 0 if negative (data error), otherwise return actual hours
  RETURN GREATEST(0, hours_diff);
END;
$function$;

-- Update the refresh_user_kpi_metrics function to use safe calculation
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing metrics for the target date
  DELETE FROM public.user_kpi_metrics WHERE metric_date = target_date;
  
  -- Insert refreshed metrics with safe processing hours calculation
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
    -- Each user gets fractional truck credit (1/number_of_handlers)
    SUM(CASE 
      WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 
        1.0 / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
      ELSE 0 
    END) as total_trucks_handled,
    -- Fractional completed truck credit
    SUM(CASE 
      WHEN (t.status = 'COMPLETED' OR t.status = 'DONE') AND (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 
        1.0 / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
      ELSE 0 
    END) as completed_trucks,
    -- Use safe processing hours calculation
    AVG(CASE 
      WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id)
      THEN public.safe_calculate_processing_hours(t.started_at, t.completed_at)
    END) as avg_processing_hours,
    COUNT(DISTINCT CASE WHEN ta.completed_by_user_id = users.user_id THEN ta.id END) as tasks_completed,
    COUNT(DISTINCT CASE WHEN te.reported_by_user_id = users.user_id THEN te.id END) as exceptions_reported,
    COUNT(DISTINCT CASE WHEN ex.resolved_by_user_id = users.user_id THEN ex.id END) as exceptions_resolved,
    -- Pallets divided equally among all handlers
    SUM(CASE 
      WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 
        t.pallet_count::NUMERIC / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
      ELSE 0 
    END) as total_pallets_handled,
    AVG(CASE 
      WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 
        t.pallet_count::NUMERIC / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
      ELSE NULL 
    END) as avg_pallets_per_truck,
    -- Safe calculation for unloading speed
    CASE 
      WHEN AVG(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id)
        THEN public.safe_calculate_processing_hours(t.started_at, t.completed_at)
      END) > 0 
      THEN AVG(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 
          t.pallet_count::NUMERIC / GREATEST(1, (
            SELECT COUNT(*) FROM (
              SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
              UNION
              SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
            ) all_handlers
          ))
        ELSE NULL 
      END) / AVG(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id)
        THEN public.safe_calculate_processing_hours(t.started_at, t.completed_at)
      END)
      ELSE 0 
    END as avg_unloading_speed_pallets_per_hour
  FROM (
    -- Get ALL users who worked on trucks (primary handlers + helpers + task/exception handlers)
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
  LEFT JOIN public.trucks t ON DATE(t.updated_at) = target_date
  LEFT JOIN public.truck_handlers th ON th.truck_id = t.id AND th.handler_user_id = users.user_id
  LEFT JOIN public.tasks ta ON ta.completed_by_user_id = users.user_id AND DATE(ta.updated_at) = target_date
  LEFT JOIN public.truck_exceptions te ON te.reported_by_user_id = users.user_id AND DATE(te.updated_at) = target_date
  LEFT JOIN public.truck_exceptions ex ON ex.resolved_by_user_id = users.user_id AND DATE(ex.updated_at) = target_date
  GROUP BY users.user_id, target_date;
END;
$function$;

-- Update performance trends with safe calculations
UPDATE public.performance_trends 
SET 
  avg_processing_hours = GREATEST(0, avg_processing_hours),
  avg_efficiency = CASE 
    WHEN avg_processing_hours <= 0 THEN 0
    ELSE GREATEST(0, avg_efficiency)
  END
WHERE avg_processing_hours < 0;

-- Refresh the KPI metrics to fix current negative values
SELECT public.refresh_user_kpi_metrics(CURRENT_DATE);