-- Create storage bucket for truck photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('truck-photos', 'truck-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for truck photos bucket
DO $$
BEGIN
    -- Drop any existing policies first
    DROP POLICY IF EXISTS "truck_photos_select_public" ON storage.objects;
    DROP POLICY IF EXISTS "truck_photos_insert_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "truck_photos_update_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "truck_photos_delete_authenticated" ON storage.objects;
    
    -- Create new policies
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
END $$;