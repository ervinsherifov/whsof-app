-- Clean up duplicate storage policies for truck-photos bucket
DROP POLICY IF EXISTS "Allow public access to truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view truck photos they uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload truck photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload truck photos" ON storage.objects;

-- Create clean storage policies for truck-photos bucket
CREATE POLICY "truck_photos_select_public" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'truck-photos');

CREATE POLICY "truck_photos_insert_authenticated" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'truck-photos' AND auth.role() = 'authenticated');

CREATE POLICY "truck_photos_update_authenticated" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'truck-photos' AND auth.role() = 'authenticated');

CREATE POLICY "truck_photos_delete_authenticated" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'truck-photos' AND auth.role() = 'authenticated');