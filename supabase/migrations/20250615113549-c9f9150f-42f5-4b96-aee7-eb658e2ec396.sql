-- Revoke public access from materialized views to secure them
REVOKE ALL ON public.kpi_dashboard_summary FROM anon, authenticated;
REVOKE ALL ON public.user_performance_summary FROM anon, authenticated;

-- Grant only select access to authenticated users
GRANT SELECT ON public.kpi_dashboard_summary TO authenticated;
GRANT SELECT ON public.user_performance_summary TO authenticated;