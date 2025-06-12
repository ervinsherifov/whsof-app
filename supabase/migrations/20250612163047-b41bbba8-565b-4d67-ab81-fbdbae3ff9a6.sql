-- Create user-specific KPI metrics table
CREATE TABLE public.user_kpi_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_trucks_handled BIGINT DEFAULT 0,
  completed_trucks BIGINT DEFAULT 0,
  avg_processing_hours NUMERIC,
  tasks_completed BIGINT DEFAULT 0,
  exceptions_reported BIGINT DEFAULT 0,
  exceptions_resolved BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.user_kpi_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for user KPI metrics
CREATE POLICY "Users can view their own KPI metrics" 
ON public.user_kpi_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Office and Super admins can view all user KPI metrics" 
ON public.user_kpi_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_kpi_metrics_updated_at
BEFORE UPDATE ON public.user_kpi_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for user KPI with profile information
CREATE VIEW public.user_kpi_with_profiles AS
SELECT 
  ukm.*,
  p.display_name,
  p.email
FROM public.user_kpi_metrics ukm
LEFT JOIN public.profiles p ON ukm.user_id = p.user_id;

-- Enable RLS on the view
ALTER VIEW public.user_kpi_with_profiles SET (security_barrier = true);

-- Create function to refresh user KPI metrics
CREATE OR REPLACE FUNCTION public.refresh_user_kpi_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert or update user KPI metrics for the target date
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
    COALESCE(truck_stats.user_id, task_stats.user_id, exception_stats.user_id) as user_id,
    target_date,
    COALESCE(truck_stats.total_trucks, 0),
    COALESCE(truck_stats.completed_trucks, 0),
    truck_stats.avg_processing_hours,
    COALESCE(task_stats.tasks_completed, 0),
    COALESCE(exception_stats.exceptions_reported, 0),
    COALESCE(exception_stats.exceptions_resolved, 0)
  FROM (
    -- Truck statistics per user
    SELECT 
      handled_by_user_id as user_id,
      COUNT(*) as total_trucks,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_trucks,
      AVG(
        CASE 
          WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0
          ELSE NULL 
        END
      ) as avg_processing_hours
    FROM public.trucks 
    WHERE DATE(created_at) = target_date
      AND handled_by_user_id IS NOT NULL
    GROUP BY handled_by_user_id
  ) truck_stats
  FULL OUTER JOIN (
    -- Task statistics per user
    SELECT 
      completed_by_user_id as user_id,
      COUNT(*) as tasks_completed
    FROM public.tasks
    WHERE DATE(completed_at) = target_date
      AND completed_by_user_id IS NOT NULL
    GROUP BY completed_by_user_id
  ) task_stats ON truck_stats.user_id = task_stats.user_id
  FULL OUTER JOIN (
    -- Exception statistics per user
    SELECT 
      reported_by_user_id as user_id,
      COUNT(*) as exceptions_reported,
      COUNT(*) FILTER (WHERE resolved_by_user_id = reported_by_user_id) as exceptions_resolved
    FROM public.truck_exceptions
    WHERE DATE(created_at) = target_date
    GROUP BY reported_by_user_id
  ) exception_stats ON COALESCE(truck_stats.user_id, task_stats.user_id) = exception_stats.user_id
  ON CONFLICT (user_id, metric_date) 
  DO UPDATE SET
    total_trucks_handled = EXCLUDED.total_trucks_handled,
    completed_trucks = EXCLUDED.completed_trucks,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    tasks_completed = EXCLUDED.tasks_completed,
    exceptions_reported = EXCLUDED.exceptions_reported,
    exceptions_resolved = EXCLUDED.exceptions_resolved,
    updated_at = now();
END;
$$;