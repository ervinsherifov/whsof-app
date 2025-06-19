-- Clear all truck, task, and overtime data for fresh testing with correct timezones

-- Clear photo-related data first (due to foreign keys)
DELETE FROM public.photo_annotations;
DELETE FROM public.photo_quality_metrics;
DELETE FROM public.truck_completion_photos;
DELETE FROM public.task_completion_photos;
DELETE FROM public.truck_photo_compliance;

-- Clear truck-related data
DELETE FROM public.truck_status_history;
DELETE FROM public.truck_exceptions;
DELETE FROM public.truck_handlers;
DELETE FROM public.truck_notifications;

-- Clear task data
DELETE FROM public.tasks;

-- Clear time entries (overtime data)
DELETE FROM public.time_entries;

-- Clear trucks
DELETE FROM public.trucks;

-- Clear KPI and performance data
DELETE FROM public.user_kpi_metrics;
DELETE FROM public.performance_trends;

-- Reset auto-increment sequences if any exist
-- (This ensures clean IDs when new data is added)

-- Refresh materialized views to reflect empty state
REFRESH MATERIALIZED VIEW public.kpi_dashboard_summary;
REFRESH MATERIALIZED VIEW public.user_performance_summary;