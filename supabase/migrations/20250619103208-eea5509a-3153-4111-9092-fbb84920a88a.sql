-- Safe Database Performance Improvements - Only Indexes and Functions
-- Adding performance indexes and monitoring functions without constraints

-- ========================================
-- PERFORMANCE IMPROVEMENTS - ADD INDEXES
-- ========================================

-- Core truck operations indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trucks_status_arrival_composite 
ON public.trucks(status, arrival_date, arrival_time) 
WHERE status IN ('SCHEDULED', 'ARRIVED', 'IN_PROGRESS');

CREATE INDEX IF NOT EXISTS idx_trucks_overdue_status 
ON public.trucks(is_overdue, status) 
WHERE is_overdue = true;

CREATE INDEX IF NOT EXISTS idx_trucks_completed_status 
ON public.trucks(status, completed_at) 
WHERE status IN ('COMPLETED', 'DONE');

CREATE INDEX IF NOT EXISTS idx_trucks_priority_status_composite 
ON public.trucks(priority, status, arrival_date);

-- Task performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned_composite 
ON public.tasks(status, assigned_to_user_id, due_date) 
WHERE assigned_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_truck_status 
ON public.tasks(truck_id, status) 
WHERE truck_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_completed_status 
ON public.tasks(status, completed_at) 
WHERE status = 'COMPLETED';

-- Time tracking performance indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date_range 
ON public.time_entries(user_id, check_in_time) 
WHERE check_out_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_overtime_pending 
ON public.time_entries(user_id, approval_status) 
WHERE overtime_hours > 0 AND approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_time_entries_weekend_holiday 
ON public.time_entries(user_id, is_weekend, is_holiday) 
WHERE is_weekend = true OR is_holiday = true;

-- KPI and reporting indexes
CREATE INDEX IF NOT EXISTS idx_user_kpi_metrics_user_date_composite 
ON public.user_kpi_metrics(user_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_kpi_metrics_date_performance 
ON public.user_kpi_metrics(metric_date, total_trucks_handled, completed_trucks) 
WHERE total_trucks_handled > 0;

-- Photo and compliance indexes
CREATE INDEX IF NOT EXISTS idx_truck_photos_truck_category_active 
ON public.truck_completion_photos(truck_id, category_id) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_truck_photos_uploaded_by_user 
ON public.truck_completion_photos(uploaded_by_user_id, created_at) 
WHERE is_deleted = false;

-- Exception tracking indexes
CREATE INDEX IF NOT EXISTS idx_truck_exceptions_status_priority 
ON public.truck_exceptions(status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_truck_exceptions_truck_pending 
ON public.truck_exceptions(truck_id, status) 
WHERE status = 'PENDING';

-- Notification system indexes
CREATE INDEX IF NOT EXISTS idx_truck_notifications_user_unread 
ON public.truck_notifications(target_user_id, is_read, created_at) 
WHERE target_user_id IS NOT NULL AND is_read = false;

CREATE INDEX IF NOT EXISTS idx_truck_notifications_expires 
ON public.truck_notifications(expires_at) 
WHERE expires_at IS NOT NULL;

-- ========================================
-- UNIQUE INDEXES FOR DATA INTEGRITY
-- ========================================

-- Add helpful unique constraints for data integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_kpi_metrics_user_date_unique 
ON public.user_kpi_metrics(user_id, metric_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_truck_photo_compliance_truck_unique 
ON public.truck_photo_compliance(truck_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_trends_date_unique 
ON public.performance_trends(date);

-- ========================================
-- IMPROVED VALIDATION FUNCTIONS
-- ========================================

-- Enhanced input sanitization function
CREATE OR REPLACE FUNCTION public.enhanced_sanitize_text(input_text text, max_length integer DEFAULT 1000)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE STRICT
SECURITY DEFINER
AS $$
BEGIN
  IF input_text IS NULL OR length(trim(input_text)) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Remove HTML tags, dangerous characters, and excessive whitespace
  RETURN left(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '<[^>]*>', '', 'g'),
        '[<>&"''\x00-\x08\x0B\x0C\x0E-\x1F\x7F]',
        '', 
        'g'
      ),
      '\s+', ' ', 'g'
    ),
    max_length
  );
END;
$$;

-- ========================================
-- MONITORING AND ALERTING FUNCTIONS
-- ========================================

-- Function to detect potential security issues
CREATE OR REPLACE FUNCTION public.security_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  tables_without_rls integer;
  suspicious_activity integer;
BEGIN
  -- Count tables without RLS (should be 0 or very few)
  SELECT COUNT(*) INTO tables_without_rls
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT c.relrowsecurity;
  
  -- Check for recent suspicious activity patterns
  SELECT COUNT(*) INTO suspicious_activity
  FROM public.truck_status_history
  WHERE created_at > now() - interval '1 hour'
    AND change_reason LIKE '%SECURITY%';
  
  result := jsonb_build_object(
    'timestamp', now(),
    'tables_without_rls', tables_without_rls,
    'suspicious_activity_last_hour', suspicious_activity,
    'status', CASE 
      WHEN tables_without_rls > 5 THEN 'WARNING'
      WHEN suspicious_activity > 100 THEN 'WARNING'
      ELSE 'OK'
    END
  );
  
  RETURN result;
END;
$$;

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION public.performance_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_trucks integer;
  avg_query_time numeric;
  active_connections integer;
BEGIN
  -- Get basic performance metrics
  SELECT COUNT(*) INTO total_trucks FROM public.trucks;
  
  -- Calculate average processing time (as a proxy for performance)
  SELECT AVG(
    CASE 
      WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0 
    END
  ) INTO avg_query_time
  FROM public.trucks
  WHERE completed_at > now() - interval '24 hours';
  
  result := jsonb_build_object(
    'timestamp', now(),
    'total_trucks', total_trucks,
    'avg_processing_hours_24h', COALESCE(avg_query_time, 0),
    'performance_status', CASE 
      WHEN avg_query_time > 8 THEN 'SLOW'
      WHEN avg_query_time > 4 THEN 'MODERATE'
      ELSE 'GOOD'
    END
  );
  
  RETURN result;
END;
$$;

-- Function to get database index usage statistics
CREATE OR REPLACE FUNCTION public.index_usage_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_indexes integer;
  unused_indexes integer;
BEGIN
  -- Get basic index statistics
  SELECT COUNT(*) INTO total_indexes
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public';
  
  -- Count potentially unused indexes (no scans)
  SELECT COUNT(*) INTO unused_indexes
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public' 
    AND idx_scan = 0;
  
  result := jsonb_build_object(
    'timestamp', now(),
    'total_indexes', total_indexes,
    'unused_indexes', unused_indexes,
    'index_usage_ratio', CASE 
      WHEN total_indexes > 0 THEN 
        ROUND((total_indexes - unused_indexes)::numeric / total_indexes::numeric * 100, 2)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$;