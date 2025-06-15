-- Fix the performance_trends table unique constraint issue
-- Add unique constraint on date if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'performance_trends_date_key'
    ) THEN
        ALTER TABLE public.performance_trends ADD CONSTRAINT performance_trends_date_key UNIQUE (date);
    END IF;
END $$;

-- Update the refresh function to handle the conflict properly
CREATE OR REPLACE FUNCTION public.refresh_all_kpi_views()
RETURNS void AS $$
BEGIN
  -- Refresh both materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_performance_summary;
  
  -- Log the refresh with proper conflict handling
  INSERT INTO public.performance_trends (
    date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
  )
  SELECT 
    CURRENT_DATE,
    total_trucks,
    completed_trucks,
    avg_processing_hours,
    0 as total_pallets, -- Will be updated when pallet tracking is enhanced
    0 as avg_efficiency -- Will be calculated when efficiency metrics are added
  FROM public.kpi_dashboard_summary
  WHERE metric_date = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_trucks = EXCLUDED.total_trucks,
    completed_trucks = EXCLUDED.completed_trucks,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    total_pallets = EXCLUDED.total_pallets,
    avg_efficiency = EXCLUDED.avg_efficiency,
    created_at = now();
    
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error refreshing materialized views: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Force refresh the KPI data now
SELECT public.refresh_all_kpi_views();