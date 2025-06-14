-- Enable required extensions for cron jobs and real-time features
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create materialized view for faster KPI queries
CREATE MATERIALIZED VIEW IF NOT EXISTS public.kpi_dashboard_summary AS
SELECT 
  COUNT(*) as total_trucks,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_trucks,
  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_trucks,
  COUNT(CASE WHEN status = 'ARRIVED' THEN 1 END) as arrived_trucks,
  COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduled_trucks,
  COUNT(CASE WHEN priority = 'URGENT' THEN 1 END) as urgent_trucks,
  COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority_trucks,
  COUNT(CASE WHEN priority = 'NORMAL' THEN 1 END) as normal_priority_trucks,
  COUNT(CASE WHEN priority = 'LOW' THEN 1 END) as low_priority_trucks,
  AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0 END) as avg_processing_hours,
  (SELECT COUNT(*) FROM truck_exceptions WHERE status = 'PENDING') as pending_exceptions,
  (SELECT COUNT(*) FROM truck_exceptions WHERE status = 'RESOLVED') as resolved_exceptions,
  CURRENT_DATE as metric_date
FROM trucks;

-- Create performance targets table
CREATE TABLE IF NOT EXISTS public.performance_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  metric_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create KPI alerts table
CREATE TABLE IF NOT EXISTS public.kpi_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  metric_name TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'BELOW', -- BELOW, ABOVE
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create performance trends table for historical data
CREATE TABLE IF NOT EXISTS public.performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_trucks INTEGER DEFAULT 0,
  completed_trucks INTEGER DEFAULT 0,
  avg_processing_hours NUMERIC DEFAULT 0,
  total_pallets INTEGER DEFAULT 0,
  avg_efficiency NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_kpi_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.kpi_dashboard_summary;
  
  -- Insert daily trend data
  INSERT INTO public.performance_trends (
    date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
  )
  SELECT 
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END),
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
    avg_efficiency = EXCLUDED.avg_efficiency;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE public.performance_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_trends ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_performance_targets_user ON public.performance_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_user ON public.kpi_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_trends_date ON public.performance_trends(date);

-- Schedule cron job to refresh KPI data every hour
SELECT cron.schedule(
  'refresh-kpi-dashboard',
  '0 * * * *', -- every hour
  'SELECT refresh_kpi_dashboard();'
);