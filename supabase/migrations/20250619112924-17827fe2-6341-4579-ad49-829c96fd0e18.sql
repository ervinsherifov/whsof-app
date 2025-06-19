-- Add sample historical data to performance_trends for chart visualization
INSERT INTO public.performance_trends (date, total_trucks, completed_trucks, avg_processing_hours, total_pallets, avg_efficiency) VALUES
  ('2025-06-12', 8, 7, 2.5, 140, 18.2),
  ('2025-06-13', 12, 10, 2.8, 195, 17.8),
  ('2025-06-14', 6, 5, 2.2, 98, 19.1),
  ('2025-06-15', 9, 8, 2.6, 156, 18.5),
  ('2025-06-16', 11, 9, 2.4, 178, 19.3),
  ('2025-06-17', 7, 6, 2.7, 125, 17.9),
  ('2025-06-18', 10, 9, 2.3, 167, 18.8)
ON CONFLICT (date) DO NOTHING;