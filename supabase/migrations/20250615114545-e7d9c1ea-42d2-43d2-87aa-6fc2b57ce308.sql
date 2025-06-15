-- Refresh materialized views to ensure clean state after data cleanup
REFRESH MATERIALIZED VIEW public.kpi_dashboard_summary;
REFRESH MATERIALIZED VIEW public.user_performance_summary;