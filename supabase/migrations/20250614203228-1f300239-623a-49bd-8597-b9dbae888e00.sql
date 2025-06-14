-- Fix truck_photo_compliance table by adding unique constraint on truck_id
ALTER TABLE public.truck_photo_compliance 
ADD CONSTRAINT truck_photo_compliance_truck_id_unique UNIQUE (truck_id);