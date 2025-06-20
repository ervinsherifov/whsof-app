-- Security Fix: Clean up conflicting and overlapping RLS policies
-- This migration removes duplicate policies and consolidates to single, clear policies per operation

-- ===== PROFILES TABLE CLEANUP =====
-- Drop duplicate and conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Office and Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;

-- Create clean, consolidated policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (
  auth.uid() = user_id
);

-- ===== TASKS TABLE CLEANUP =====
-- Drop duplicate and conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_users_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Office Admins can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "staff_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can update task status" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks or admins can update all" ON public.tasks;
DROP POLICY IF EXISTS "assigned_users_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "creator_admin_delete_tasks" ON public.tasks;

-- Create clean, consolidated policies for tasks
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid())
  END
);
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND auth.uid() = created_by_user_id
);
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid())
  END
);
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
  OR created_by_user_id = auth.uid()
);

-- ===== TIME_ENTRIES TABLE CLEANUP =====
-- Drop duplicate and conflicting policies
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert_policy" ON public.time_entries;
DROP POLICY IF EXISTS "users_insert_own_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admins can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_select_policy" ON public.time_entries;
DROP POLICY IF EXISTS "users_view_own_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Super admin can update all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update_policy" ON public.time_entries;
DROP POLICY IF EXISTS "users_update_own_time_entries" ON public.time_entries;

-- Create clean, consolidated policies for time_entries
CREATE POLICY "time_entries_select_policy" ON public.time_entries FOR SELECT USING (
  auth.uid() = user_id 
  OR public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
);
CREATE POLICY "time_entries_insert_policy" ON public.time_entries FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "time_entries_update_policy" ON public.time_entries FOR UPDATE USING (
  auth.uid() = user_id 
  OR public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
);

-- ===== TRUCKS TABLE CLEANUP =====
-- Drop duplicate and conflicting policies
DROP POLICY IF EXISTS "All users can view trucks" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated users can view trucks" ON public.trucks;
DROP POLICY IF EXISTS "authenticated_users_select_trucks" ON public.trucks;
DROP POLICY IF EXISTS "Users with proper roles can create trucks" ON public.trucks;
DROP POLICY IF EXISTS "office_admin_insert_trucks" ON public.trucks;
DROP POLICY IF EXISTS "Warehouse staff and admins can update trucks" ON public.trucks;
DROP POLICY IF EXISTS "Warehouse staff can update trucks" ON public.trucks;
DROP POLICY IF EXISTS "staff_update_trucks" ON public.trucks;
DROP POLICY IF EXISTS "Super Admins can delete trucks" ON public.trucks;
DROP POLICY IF EXISTS "admin_delete_trucks" ON public.trucks;

-- Create clean, consolidated policies for trucks
CREATE POLICY "trucks_select_policy" ON public.trucks FOR SELECT USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    WHEN public.get_current_user_role() = 'WAREHOUSE_STAFF' THEN status != 'DONE'
    ELSE false
  END
);
CREATE POLICY "trucks_insert_policy" ON public.trucks FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND auth.uid() = created_by_user_id
);
CREATE POLICY "trucks_update_policy" ON public.trucks FOR UPDATE USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);
CREATE POLICY "trucks_delete_policy" ON public.trucks FOR DELETE USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
);

-- ===== USER_ROLES TABLE CLEANUP =====
-- Drop duplicate and conflicting policies
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "super_admin_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;

-- Create clean, consolidated policies for user_roles
CREATE POLICY "user_roles_select_policy" ON public.user_roles FOR SELECT USING (
  auth.uid() = user_id 
  OR public.get_current_user_role() = 'SUPER_ADMIN'
);
CREATE POLICY "user_roles_insert_policy" ON public.user_roles FOR INSERT WITH CHECK (
  public.get_current_user_role() = 'SUPER_ADMIN'
);
CREATE POLICY "user_roles_update_policy" ON public.user_roles FOR UPDATE USING (
  public.get_current_user_role() = 'SUPER_ADMIN'
);
CREATE POLICY "user_roles_delete_policy" ON public.user_roles FOR DELETE USING (
  public.get_current_user_role() = 'SUPER_ADMIN'
);