-- Add RLS policies for truck_completion_photos table
-- Enable RLS if not already enabled
ALTER TABLE public.truck_completion_photos ENABLE ROW LEVEL SECURITY;

-- Policy for inserting photos (allow authenticated users)
CREATE POLICY "Users can upload truck photos" 
ON public.truck_completion_photos 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = uploaded_by_user_id);

-- Policy for reading photos (allow all authenticated users)
CREATE POLICY "Users can view truck photos" 
ON public.truck_completion_photos 
FOR SELECT 
TO authenticated
USING (true);

-- Policy for updating photos (allow uploader only)
CREATE POLICY "Users can update their own photos" 
ON public.truck_completion_photos 
FOR UPDATE 
TO authenticated
USING (auth.uid() = uploaded_by_user_id);

-- Policy for deleting photos (allow uploader only)
CREATE POLICY "Users can delete their own photos" 
ON public.truck_completion_photos 
FOR DELETE 
TO authenticated
USING (auth.uid() = uploaded_by_user_id);