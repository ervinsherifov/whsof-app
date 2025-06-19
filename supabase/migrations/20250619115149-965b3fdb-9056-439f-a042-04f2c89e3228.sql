-- Fix average processing hours calculation to be proportional like pallets
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing metrics for the target date
  DELETE FROM public.user_kpi_metrics WHERE metric_date = target_date;
  
  -- Insert refreshed metrics with CORRECTED processing hours calculation
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
    -- FIXED: Average processing hours - divide by number of handlers like pallets
    CASE 
      WHEN COUNT(CASE WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 1 END) > 0
      THEN AVG(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id)
        THEN public.safe_calculate_processing_hours(t.started_at, t.completed_at) / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
      END)
      ELSE 0
    END as avg_processing_hours,
    COUNT(DISTINCT CASE WHEN ta.completed_by_user_id = users.user_id THEN ta.id END) as tasks_completed,
    COUNT(DISTINCT CASE WHEN te.reported_by_user_id = users.user_id THEN te.id END) as exceptions_reported,
    COUNT(DISTINCT CASE WHEN ex.resolved_by_user_id = users.user_id THEN ex.id END) as exceptions_resolved,
    -- Total pallets handled by this user (proportional share)
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
    -- Average pallets per truck for this user (proportional)
    CASE 
      WHEN COUNT(CASE WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 1 END) > 0
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
      END)
      ELSE 0
    END as avg_pallets_per_truck,
    -- Pallets per hour = Total pallets handled / Total processing time (both proportional)
    CASE 
      WHEN SUM(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id)
        THEN public.safe_calculate_processing_hours(t.started_at, t.completed_at) / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
        ELSE 0
      END) > 0 
      THEN SUM(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id) THEN 
          t.pallet_count::NUMERIC / GREATEST(1, (
            SELECT COUNT(*) FROM (
              SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
              UNION
              SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
            ) all_handlers
          ))
        ELSE 0 
      END) / SUM(CASE 
        WHEN (t.handled_by_user_id = users.user_id OR th.handler_user_id = users.user_id)
        THEN public.safe_calculate_processing_hours(t.started_at, t.completed_at) / GREATEST(1, (
          SELECT COUNT(*) FROM (
            SELECT t.handled_by_user_id as user_id WHERE t.handled_by_user_id IS NOT NULL
            UNION
            SELECT th2.handler_user_id as user_id FROM truck_handlers th2 WHERE th2.truck_id = t.id
          ) all_handlers
        ))
        ELSE 0
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

-- Refresh the metrics with corrected calculations
SELECT public.refresh_user_kpi_metrics(CURRENT_DATE);