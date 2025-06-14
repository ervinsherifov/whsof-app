-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'time_entries' AND schemaname = 'public';

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can update approval status" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can update all time entries" ON public.time_entries;

-- Create simple, working policies
CREATE POLICY "time_entries_select_policy" 
ON public.time_entries 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "time_entries_insert_policy" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "time_entries_update_policy" 
ON public.time_entries 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'time_entries' AND schemaname = 'public';