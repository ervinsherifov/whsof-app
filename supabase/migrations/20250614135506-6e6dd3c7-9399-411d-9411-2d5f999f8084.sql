-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can update approval status" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can update all time entries" ON public.time_entries;

-- Enable RLS on time_entries if not already enabled
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own time entries
CREATE POLICY "Users can view their own time entries" 
ON public.time_entries 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own time entries
CREATE POLICY "Users can insert their own time entries" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own time entries (but not approval fields when approved)
CREATE POLICY "Users can update their own time entries" 
ON public.time_entries 
FOR UPDATE 
USING (auth.uid() = user_id AND approval_status != 'approved');

-- Allow SUPER_ADMIN to view all time entries
CREATE POLICY "Super admin can view all time entries" 
ON public.time_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);

-- Allow SUPER_ADMIN to update any time entries (including approval status)
CREATE POLICY "Super admin can update all time entries" 
ON public.time_entries 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);