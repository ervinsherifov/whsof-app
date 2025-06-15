-- Clean up test data for production
DELETE FROM public.truck_completion_photos WHERE created_at > '2025-01-01';
DELETE FROM public.tasks WHERE created_at > '2025-01-01';
DELETE FROM public.time_entries WHERE created_at > '2025-01-01';
DELETE FROM public.trucks WHERE created_at > '2025-01-01';

-- Also clean up any KPI metrics that might have test data
DELETE FROM public.user_kpi_metrics WHERE metric_date >= '2025-01-01';

-- Refresh the materialized views to reflect the cleaned data
REFRESH MATERIALIZED VIEW public.kpi_dashboard_summary;
REFRESH MATERIALIZED VIEW public.user_performance_summary;