-- Fix numeric precision in photo_quality_metrics table
-- Change precision from (3,1) to (5,2) to allow values up to 999.99
ALTER TABLE public.photo_quality_metrics 
ALTER COLUMN quality_score TYPE NUMERIC(5,2);

ALTER TABLE public.photo_quality_metrics 
ALTER COLUMN blur_score TYPE NUMERIC(5,2);

ALTER TABLE public.photo_quality_metrics 
ALTER COLUMN brightness_score TYPE NUMERIC(5,2);