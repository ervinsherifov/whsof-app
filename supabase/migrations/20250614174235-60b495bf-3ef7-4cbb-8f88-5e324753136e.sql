-- Database Optimization: Indexing Strategy
-- Add missing indexes on frequently queried columns

-- Trucks table indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trucks_status ON public.trucks(status);
CREATE INDEX IF NOT EXISTS idx_trucks_assigned_staff ON public.trucks(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_trucks_handled_by ON public.trucks(handled_by_user_id);
CREATE INDEX IF NOT EXISTS idx_trucks_arrival_date_time ON public.trucks(arrival_date, arrival_time);
CREATE INDEX IF NOT EXISTS idx_trucks_priority_status ON public.trucks(priority, status);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON public.tasks(completed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_truck_id ON public.tasks(truck_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON public.time_entries(user_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON public.time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_overtime ON public.time_entries(user_id) WHERE overtime_hours > 0;

-- User KPI metrics indexes
CREATE INDEX IF NOT EXISTS idx_user_kpi_user_date ON public.user_kpi_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_user_kpi_date ON public.user_kpi_metrics(metric_date);

-- Truck exceptions indexes
CREATE INDEX IF NOT EXISTS idx_truck_exceptions_truck ON public.truck_exceptions(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_exceptions_reported_by ON public.truck_exceptions(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_truck_exceptions_status ON public.truck_exceptions(status);

-- Photo completion indexes
CREATE INDEX IF NOT EXISTS idx_truck_photos_truck ON public.truck_completion_photos(truck_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_truck_photos_category ON public.truck_completion_photos(category_id) WHERE is_deleted = false;