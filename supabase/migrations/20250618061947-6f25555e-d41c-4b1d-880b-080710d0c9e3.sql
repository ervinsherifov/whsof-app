-- Final fix for user_kpi_with_profiles view security issue
-- Remove SECURITY DEFINER and ensure proper RLS compliance

-- Drop the existing view completely
DROP VIEW IF EXISTS public.user_kpi_with_profiles CASCADE;

-- Recreate the view without any security privileges (uses SECURITY INVOKER by default)
CREATE VIEW public.user_kpi_with_profiles AS
SELECT 
  ukm.id,
  ukm.user_id,
  ukm.metric_date,
  ukm.total_trucks_handled,
  ukm.completed_trucks,
  ukm.avg_processing_hours,
  ukm.tasks_completed,
  ukm.exceptions_reported,
  ukm.exceptions_resolved,
  ukm.total_pallets_handled,
  ukm.avg_pallets_per_truck,
  ukm.avg_unloading_speed_pallets_per_hour,
  ukm.created_at,
  ukm.updated_at,
  p.display_name,
  p.email
FROM user_kpi_metrics ukm
LEFT JOIN profiles p ON ukm.user_id = p.user_id;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.user_kpi_with_profiles TO authenticated;

-- Ensure the underlying tables have proper RLS policies
-- user_kpi_metrics should already have RLS enabled with proper policies
-- Let's also ensure profiles table has proper RLS if it doesn't already

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for profiles to allow users to see their own profile
-- and allow admins to see all profiles
DO $$
BEGIN
  -- Policy for users to see their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  -- Policy for admins to see all profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Office and Super admins can view all profiles'
  ) THEN
    CREATE POLICY "Office and Super admins can view all profiles" 
    ON public.profiles 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('OFFICE_ADMIN', 'SUPER_ADMIN')
      )
    );
  END IF;
END $$;

-- Verify the view is created without SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'user_kpi_with_profiles';