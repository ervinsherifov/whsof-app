-- Create function to refresh user KPI metrics (corrected version)
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  -- Delete existing metrics for the target date
  DELETE FROM public.user_kpi_metrics WHERE metric_date = target_date;
  
  -- Insert refreshed metrics for all users who have activity on the target date
  INSERT INTO public.user_kpi_metrics (
    user_id,
    metric_date,
    total_trucks_handled,
    completed_trucks,
    avg_processing_hours,
    tasks_completed,
    exceptions_reported,
    exceptions_resolved
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
    COUNT(DISTINCT CASE WHEN ex.resolved_by_user_id IS NOT NULL THEN ex.id END) as exceptions_resolved
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

-- Create view for user KPIs with profile information
CREATE OR REPLACE VIEW public.user_kpi_with_profiles AS
SELECT 
  ukm.*,
  p.display_name,
  p.email
FROM public.user_kpi_metrics ukm
LEFT JOIN public.profiles p ON ukm.user_id = p.user_id
ORDER BY ukm.metric_date DESC, ukm.total_trucks_handled DESC NULLS LAST;

-- Create trigger to refresh user KPIs when trucks are updated
CREATE OR REPLACE FUNCTION public.refresh_user_kpis_on_truck_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh metrics for today
  PERFORM public.refresh_user_kpi_metrics(CURRENT_DATE);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER truck_update_refresh_user_kpis
  AFTER INSERT OR UPDATE OR DELETE ON public.trucks
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_user_kpis_on_truck_update();

-- Create trigger to refresh user KPIs when exceptions are updated
CREATE OR REPLACE FUNCTION public.refresh_user_kpis_on_exception_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh metrics for today
  PERFORM public.refresh_user_kpi_metrics(CURRENT_DATE);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER exception_update_refresh_user_kpis
  AFTER INSERT OR UPDATE OR DELETE ON public.truck_exceptions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_user_kpis_on_exception_update();

-- Create trigger to refresh user KPIs when tasks are updated
CREATE OR REPLACE FUNCTION public.refresh_user_kpis_on_task_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh metrics for today
  PERFORM public.refresh_user_kpi_metrics(CURRENT_DATE);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_update_refresh_user_kpis
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_user_kpis_on_task_update();

-- Initial refresh for today's data
SELECT public.refresh_user_kpi_metrics(CURRENT_DATE);