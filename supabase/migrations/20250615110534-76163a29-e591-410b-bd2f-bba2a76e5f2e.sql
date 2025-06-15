-- Fix Critical Database Issues Before Production (No CONCURRENTLY)

-- 1. Add missing RLS policies for security
ALTER TABLE public.performance_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_targets
CREATE POLICY "Users can view their own performance targets" 
ON public.performance_targets 
FOR SELECT 
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));

CREATE POLICY "Admins can create performance targets" 
ON public.performance_targets 
FOR INSERT 
WITH CHECK (public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));

CREATE POLICY "Admins can update performance targets" 
ON public.performance_targets 
FOR UPDATE 
USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));

-- RLS Policies for kpi_alerts
CREATE POLICY "Users can view their own KPI alerts" 
ON public.kpi_alerts 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL OR public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));

CREATE POLICY "Admins can manage KPI alerts" 
ON public.kpi_alerts 
FOR ALL 
USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));

-- RLS Policies for performance_trends
CREATE POLICY "Authenticated users can view performance trends" 
ON public.performance_trends 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only admins can modify performance trends" 
ON public.performance_trends 
FOR ALL 
USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN'));

-- 2. Add critical performance indexes (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_trucks_created_by_user_id 
ON public.trucks(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by_user_id 
ON public.tasks(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_created_at 
ON public.time_entries(created_at);

CREATE INDEX IF NOT EXISTS idx_truck_completion_photos_uploaded_by_user_id 
ON public.truck_completion_photos(uploaded_by_user_id);

CREATE INDEX IF NOT EXISTS idx_truck_exceptions_resolved_by_user_id 
ON public.truck_exceptions(resolved_by_user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trucks_status_arrival_date 
ON public.trucks(status, arrival_date);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_check_in 
ON public.time_entries(user_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status 
ON public.tasks(assigned_to_user_id, status) WHERE assigned_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_truck_notifications_target_user_unread 
ON public.truck_notifications(target_user_id, is_read) WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trucks_ramp_status 
ON public.trucks(ramp_number, status) WHERE ramp_number IS NOT NULL;

-- 3. Add updated_at triggers for tables that are missing them
CREATE TRIGGER update_performance_targets_updated_at
  BEFORE UPDATE ON public.performance_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_alerts_updated_at
  BEFORE UPDATE ON public.kpi_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add constraints for data integrity
ALTER TABLE public.tasks 
ADD CONSTRAINT chk_task_assignment 
CHECK (
  (assigned_to_user_id IS NOT NULL AND assigned_to_name IS NOT NULL) OR 
  (assigned_to_user_id IS NULL AND assigned_to_name IS NULL)
);

ALTER TABLE public.trucks 
ADD CONSTRAINT chk_arrival_date_not_too_old 
CHECK (arrival_date >= CURRENT_DATE - INTERVAL '1 year');

ALTER TABLE public.trucks 
ADD CONSTRAINT chk_pallet_count_reasonable 
CHECK (pallet_count > 0 AND pallet_count <= 100);

ALTER TABLE public.trucks 
ADD CONSTRAINT chk_ramp_number_valid 
CHECK (ramp_number IS NULL OR (ramp_number >= 1 AND ramp_number <= 20));