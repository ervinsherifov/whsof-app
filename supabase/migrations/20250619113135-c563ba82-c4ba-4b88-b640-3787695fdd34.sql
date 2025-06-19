-- Remove fake sample data and generate real performance trends from actual truck data
DELETE FROM public.performance_trends WHERE created_at >= '2025-06-19 11:29:00';

-- Create function to generate performance trends from actual truck data
CREATE OR REPLACE FUNCTION public.generate_historical_performance_trends()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  target_date DATE;
  day_offset INTEGER;
BEGIN
  -- Generate trends for the last 30 days based on actual truck data
  FOR day_offset IN 0..29 LOOP
    target_date := CURRENT_DATE - day_offset;
    
    -- Insert performance trend for this date based on actual truck data
    INSERT INTO public.performance_trends (
      date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency
    )
    SELECT 
      target_date,
      COUNT(*) as total_trucks,
      COUNT(CASE WHEN status = 'COMPLETED' OR status = 'DONE' THEN 1 END) as completed_trucks,
      AVG(public.safe_calculate_processing_hours(started_at, completed_at)) as avg_processing_hours,
      SUM(pallet_count) as total_pallets,
      CASE 
        WHEN AVG(public.safe_calculate_processing_hours(started_at, completed_at)) > 0
        THEN AVG(pallet_count::NUMERIC / NULLIF(public.safe_calculate_processing_hours(started_at, completed_at), 0))
        ELSE 0
      END as avg_efficiency
    FROM trucks
    WHERE DATE(created_at) = target_date
    HAVING COUNT(*) > 0  -- Only insert if there's actual data for this date
    ON CONFLICT (date) DO UPDATE SET
      total_trucks = EXCLUDED.total_trucks,
      completed_trucks = EXCLUDED.completed_trucks,
      avg_processing_hours = EXCLUDED.avg_processing_hours,
      total_pallets = EXCLUDED.total_pallets,
      avg_efficiency = EXCLUDED.avg_efficiency,
      created_at = now();
  END LOOP;
END;
$function$;

-- Generate real performance trends from actual data
SELECT public.generate_historical_performance_trends();