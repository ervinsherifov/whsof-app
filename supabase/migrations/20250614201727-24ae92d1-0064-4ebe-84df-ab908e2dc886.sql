-- Add RLS policies for truck_status_history table
-- This will allow authenticated users to insert status history records

-- Policy for inserting status history (allow all authenticated users)
CREATE POLICY "Allow authenticated users to insert status history" 
ON public.truck_status_history 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy for reading status history (allow all authenticated users)
CREATE POLICY "Allow authenticated users to read status history" 
ON public.truck_status_history 
FOR SELECT 
TO authenticated
USING (true);

-- Policy for updating status history (allow all authenticated users)
CREATE POLICY "Allow authenticated users to update status history" 
ON public.truck_status_history 
FOR UPDATE 
TO authenticated
USING (true);