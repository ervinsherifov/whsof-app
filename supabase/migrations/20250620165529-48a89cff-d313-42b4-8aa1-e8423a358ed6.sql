-- CRITICAL SECURITY FIX: Remove duplicate and overly permissive RLS policies
-- This migration consolidates and secures all RLS policies

-- ===== TRUCK_EXCEPTIONS SECURITY FIX =====
-- Current policies allow ANY user to delete/update ANY exception - MAJOR SECURITY HOLE
DROP POLICY IF EXISTS "Users can delete truck exceptions" ON public.truck_exceptions;
DROP POLICY IF EXISTS "Users can update truck exceptions" ON public.truck_exceptions;
DROP POLICY IF EXISTS "Users can view truck exceptions" ON public.truck_exceptions;
DROP POLICY IF EXISTS "Users can create truck exceptions" ON public.truck_exceptions;
DROP POLICY IF EXISTS "Warehouse staff can report exceptions" ON public.truck_exceptions;

-- Create secure policies for truck_exceptions
CREATE POLICY "truck_exceptions_select_policy" ON public.truck_exceptions FOR SELECT USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE (reported_by_user_id = auth.uid() OR resolved_by_user_id = auth.uid())
  END
);
CREATE POLICY "truck_exceptions_insert_policy" ON public.truck_exceptions FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND auth.uid() = reported_by_user_id
);
CREATE POLICY "truck_exceptions_update_policy" ON public.truck_exceptions FOR UPDATE USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE (reported_by_user_id = auth.uid() OR resolved_by_user_id = auth.uid())
  END
);
CREATE POLICY "truck_exceptions_delete_policy" ON public.truck_exceptions FOR DELETE USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
  OR reported_by_user_id = auth.uid()
);

-- ===== TRUCK_HANDLERS SECURITY FIX =====
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Users can view truck handlers" ON public.truck_handlers;
DROP POLICY IF EXISTS "Authenticated users can view truck handlers" ON public.truck_handlers;
DROP POLICY IF EXISTS "authenticated_users_view_truck_handlers" ON public.truck_handlers;
DROP POLICY IF EXISTS "Authenticated users can create truck handlers" ON public.truck_handlers;
DROP POLICY IF EXISTS "Authenticated users can insert truck handlers" ON public.truck_handlers;
DROP POLICY IF EXISTS "staff_insert_truck_handlers" ON public.truck_handlers;

-- Create secure policies for truck_handlers
CREATE POLICY "truck_handlers_select_policy" ON public.truck_handlers FOR SELECT USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);
CREATE POLICY "truck_handlers_insert_policy" ON public.truck_handlers FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);

-- ===== TRUCK_STATUS_HISTORY SECURITY FIX =====
-- Remove overly permissive policies that allow anyone to view/update ALL status history
DROP POLICY IF EXISTS "Allow authenticated users to read status history" ON public.truck_status_history;
DROP POLICY IF EXISTS "Allow authenticated users to update status history" ON public.truck_status_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert status history" ON public.truck_status_history;
DROP POLICY IF EXISTS "Authenticated users can view truck status history" ON public.truck_status_history;

-- Create secure policies for truck_status_history
CREATE POLICY "truck_status_history_select_policy" ON public.truck_status_history FOR SELECT USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);
CREATE POLICY "truck_status_history_insert_policy" ON public.truck_status_history FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);

-- ===== TASK COMPLETION PHOTOS SECURITY FIX =====
-- Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can view task completion photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "authenticated_users_view_task_photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "Authenticated users can insert task completion photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "authenticated_users_upload_task_photos" ON public.task_completion_photos;

-- Create secure policies for task_completion_photos
CREATE POLICY "task_completion_photos_select_policy" ON public.task_completion_photos FOR SELECT USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);
CREATE POLICY "task_completion_photos_insert_policy" ON public.task_completion_photos FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND auth.uid() = uploaded_by_user_id
);

-- ===== PHOTO ANNOTATIONS SECURITY FIX =====
-- Remove overly permissive policy that allows anyone to view ALL annotations
DROP POLICY IF EXISTS "Users can view all photo annotations" ON public.photo_annotations;
DROP POLICY IF EXISTS "Users can create photo annotations" ON public.photo_annotations;

-- Create secure policies for photo_annotations
CREATE POLICY "photo_annotations_select_policy" ON public.photo_annotations FOR SELECT USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);
CREATE POLICY "photo_annotations_insert_policy" ON public.photo_annotations FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND auth.uid() = created_by_user_id
);

-- ===== USER_KPI_METRICS SECURITY FIX =====
-- Remove overly permissive policy
DROP POLICY IF EXISTS "User KPI metrics are viewable by authenticated users" ON public.user_kpi_metrics;

-- Create secure policy for user_kpi_metrics
CREATE POLICY "user_kpi_metrics_select_policy" ON public.user_kpi_metrics FOR SELECT USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE user_id = auth.uid()
  END
);

-- ===== CLEAN UP DUPLICATE TASK POLICIES =====
-- Remove duplicate policies on tasks table
DROP POLICY IF EXISTS "Users can view their assigned tasks or all if admin" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks or admins can update all" ON public.tasks;
DROP POLICY IF EXISTS "Authorized users can create tasks" ON public.tasks;

-- ===== CLEAN UP DUPLICATE TRUCK POLICIES =====
-- Remove duplicate policies on trucks table  
DROP POLICY IF EXISTS "Users can view trucks based on role" ON public.trucks;
DROP POLICY IF EXISTS "Authorized users can create trucks" ON public.trucks;

-- ===== CLEAN UP DUPLICATE PROFILE POLICIES =====
-- Remove duplicate policies on profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON public.profiles;