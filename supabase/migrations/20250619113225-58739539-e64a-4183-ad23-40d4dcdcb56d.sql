-- Remove the sample data that was inserted earlier
DELETE FROM public.performance_trends WHERE date >= '2025-06-12' AND date <= '2025-06-18';

-- Create function to generate real historical performance trends
CREATE OR REPLACE FUNCTION public.generate_historical_performance_trends(days_back integer DEFAULT 30)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_date DATE;
  day_count INTEGER := 0;
BEGIN
  -- Generate trends for the last N days
  WHILE day_count < days_back LOOP
    target_date := CURRENT_DATE - INTERVAL '1 day' * day_count;
    
    -- Insert performance data for this date based on actual truck data
    INSERT INTO public.performance_trends (
      date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
    )
    SELECT 
      target_date,
      COALESCE(COUNT(*), 0),
      COALESCE(COUNT(CASE WHEN status IN ('COMPLETED', 'DONE') THEN 1 END), 0),
      COALESCE(AVG(public.safe_calculate_processing_hours(started_at, completed_at)), 0),
      COALESCE(SUM(pallet_count), 0),
      CASE 
        WHEN AVG(public.safe_calculate_processing_hours(started_at, completed_at)) > 0
        THEN COALESCE(AVG(pallet_count::NUMERIC / NULLIF(public.safe_calculate_processing_hours(started_at, completed_at), 0)), 0)
        ELSE 0
      END
    FROM trucks
    WHERE DATE(updated_at) = target_date
    ON CONFLICT (date) DO UPDATE SET
      total_trucks = EXCLUDED.total_trucks,
      completed_trucks = EXCLUDED.completed_trucks,
      avg_processing_hours = EXCLUDED.avg_processing_hours,
      total_pallets = EXCLUDED.total_pallets,
      avg_efficiency = EXCLUDED.avg_efficiency,
      created_at = now();
    
    day_count := day_count + 1;
  END LOOP;
END;
$function$;

-- Generate historical trends for the last 30 days
SELECT public.generate_historical_performance_trends(30);