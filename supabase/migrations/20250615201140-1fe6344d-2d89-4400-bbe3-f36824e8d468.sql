-- Force refresh of materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_dashboard_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_performance_summary;

-- Also call the refresh function to ensure everything is up to date
SELECT public.refresh_all_kpi_views();