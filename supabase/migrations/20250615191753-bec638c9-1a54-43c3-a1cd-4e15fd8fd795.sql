-- Create RLS policies for approved_users table
DROP POLICY IF EXISTS "Super admins can manage approved users" ON public.approved_users;

-- Allow super admins to view all approved users
CREATE POLICY "Super admins can view approved users" 
ON public.approved_users 
FOR SELECT 
USING (public.get_current_user_role() = 'SUPER_ADMIN');

-- Allow super admins to insert approved users
CREATE POLICY "Super admins can insert approved users" 
ON public.approved_users 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'SUPER_ADMIN');

-- Allow super admins to update approved users
CREATE POLICY "Super admins can update approved users" 
ON public.approved_users 
FOR UPDATE 
USING (public.get_current_user_role() = 'SUPER_ADMIN');

-- Allow super admins to delete approved users
CREATE POLICY "Super admins can delete approved users" 
ON public.approved_users 
FOR DELETE 
USING (public.get_current_user_role() = 'SUPER_ADMIN');