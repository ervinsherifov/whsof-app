-- Clean up duplicate and conflicting RLS policies on truck_completion_photos table
DROP POLICY IF EXISTS "Users can upload truck photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Users can view truck photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Users can view truck photos based on role" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Warehouse staff can upload truck photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Users can insert their own truck completion photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "Authenticated users can view truck completion photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "authenticated_users_upload_truck_photos" ON public.truck_completion_photos;
DROP POLICY IF EXISTS "authenticated_users_view_truck_photos" ON public.truck_completion_photos;

-- Create clean, simple RLS policies
CREATE POLICY "truck_photos_select_authenticated" 
ON public.truck_completion_photos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "truck_photos_insert_authenticated" 
ON public.truck_completion_photos 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = uploaded_by_user_id);

CREATE POLICY "truck_photos_update_owner" 
ON public.truck_completion_photos 
FOR UPDATE 
TO authenticated
USING (auth.uid() = uploaded_by_user_id);

CREATE POLICY "truck_photos_delete_owner" 
ON public.truck_completion_photos 
FOR DELETE 
TO authenticated
USING (auth.uid() = uploaded_by_user_id);