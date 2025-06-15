-- Enable real-time for KPI tables
ALTER TABLE public.trucks REPLICA IDENTITY FULL;
ALTER TABLE public.truck_exceptions REPLICA IDENTITY FULL;
ALTER TABLE public.user_kpi_metrics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.trucks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truck_exceptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_kpi_metrics;