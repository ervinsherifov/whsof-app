-- Enhanced Truck Status Management System
-- Add columns to track truck status history and overdue handling

-- Add new columns to trucks table
ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_arrival_date DATE,
ADD COLUMN IF NOT EXISTS actual_arrival_date DATE,
ADD COLUMN IF NOT EXISTS overdue_marked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_arrival_reason TEXT;

-- Create truck status history table
CREATE TABLE IF NOT EXISTS public.truck_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id UUID,
  changed_by_system BOOLEAN DEFAULT false,
  change_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create truck notifications table
CREATE TABLE IF NOT EXISTS public.truck_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'OVERDUE', 'LATE_ARRIVAL', 'RESCHEDULED', 'STATUS_CHANGE'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'INFO', -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  is_read BOOLEAN DEFAULT false,
  target_user_id UUID, -- null means all users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Function to mark overdue trucks
CREATE OR REPLACE FUNCTION public.mark_overdue_trucks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  overdue_count INTEGER := 0;
  truck_record RECORD;
BEGIN
  -- Find trucks that are scheduled but past their arrival date
  FOR truck_record IN 
    SELECT id, license_plate, arrival_date, arrival_time
    FROM public.trucks 
    WHERE status = 'SCHEDULED' 
      AND is_overdue = false
      AND (arrival_date < CURRENT_DATE 
           OR (arrival_date = CURRENT_DATE AND arrival_time < CURRENT_TIME))
  LOOP
    -- Mark truck as overdue
    UPDATE public.trucks 
    SET 
      is_overdue = true,
      overdue_marked_at = now(),
      original_arrival_date = COALESCE(original_arrival_date, truck_record.arrival_date)
    WHERE id = truck_record.id;
    
    -- Log status change
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, changed_by_system, change_reason
    ) VALUES (
      truck_record.id, 'SCHEDULED', 'OVERDUE', true, 'Automatic overdue detection'
    );
    
    -- Create notification
    INSERT INTO public.truck_notifications (
      truck_id, notification_type, title, message, severity, expires_at
    ) VALUES (
      truck_record.id, 
      'OVERDUE', 
      'Truck Overdue: ' || truck_record.license_plate,
      'Truck ' || truck_record.license_plate || ' was scheduled for ' || 
      truck_record.arrival_date || ' at ' || truck_record.arrival_time || ' but has not arrived.',
      'WARNING',
      now() + INTERVAL '24 hours'
    );
    
    overdue_count := overdue_count + 1;
  END LOOP;
  
  RETURN overdue_count;
END;
$$;

-- Function to reschedule overdue truck
CREATE OR REPLACE FUNCTION public.reschedule_overdue_truck(
  p_truck_id UUID,
  p_new_date DATE,
  p_new_time TIME,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  truck_record RECORD;
BEGIN
  -- Get truck details
  SELECT * INTO truck_record FROM public.trucks WHERE id = p_truck_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Truck not found';
  END IF;
  
  -- Update truck with new schedule
  UPDATE public.trucks 
  SET 
    arrival_date = p_new_date,
    arrival_time = p_new_time,
    is_overdue = false,
    overdue_marked_at = NULL,
    reschedule_count = reschedule_count + 1,
    original_arrival_date = COALESCE(original_arrival_date, truck_record.arrival_date),
    updated_at = now()
  WHERE id = p_truck_id;
  
  -- Log status change
  INSERT INTO public.truck_status_history (
    truck_id, old_status, new_status, changed_by_user_id, change_reason, metadata
  ) VALUES (
    p_truck_id, 
    CASE WHEN truck_record.is_overdue THEN 'OVERDUE' ELSE truck_record.status END,
    'SCHEDULED', 
    p_user_id, 
    COALESCE(p_reason, 'Truck rescheduled'),
    jsonb_build_object(
      'old_date', truck_record.arrival_date,
      'old_time', truck_record.arrival_time,
      'new_date', p_new_date,
      'new_time', p_new_time,
      'reschedule_count', truck_record.reschedule_count + 1
    )
  );
  
  -- Create notification
  INSERT INTO public.truck_notifications (
    truck_id, notification_type, title, message, severity
  ) VALUES (
    p_truck_id, 
    'RESCHEDULED', 
    'Truck Rescheduled: ' || truck_record.license_plate,
    'Truck ' || truck_record.license_plate || ' has been rescheduled from ' || 
    truck_record.arrival_date || ' to ' || p_new_date || ' at ' || p_new_time || 
    CASE WHEN p_reason IS NOT NULL THEN '. Reason: ' || p_reason ELSE '' END,
    'INFO'
  );
  
  RETURN true;
END;
$$;

-- Function to handle actual truck arrival
CREATE OR REPLACE FUNCTION public.handle_truck_arrival(
  p_truck_id UUID,
  p_actual_arrival_date DATE DEFAULT CURRENT_DATE,
  p_late_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  truck_record RECORD;
  was_late BOOLEAN := false;
  arrival_type TEXT;
BEGIN
  -- Get truck details
  SELECT * INTO truck_record FROM public.trucks WHERE id = p_truck_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Truck not found';
  END IF;
  
  -- Determine if arrival was late
  was_late := (p_actual_arrival_date > truck_record.arrival_date OR truck_record.is_overdue);
  arrival_type := CASE WHEN was_late THEN 'LATE' ELSE 'ON_TIME' END;
  
  -- Update truck status
  UPDATE public.trucks 
  SET 
    status = 'ARRIVED',
    actual_arrival_date = p_actual_arrival_date,
    is_overdue = false,
    overdue_marked_at = NULL,
    late_arrival_reason = p_late_reason,
    updated_at = now()
  WHERE id = p_truck_id;
  
  -- Log status change
  INSERT INTO public.truck_status_history (
    truck_id, old_status, new_status, changed_by_user_id, change_reason, metadata
  ) VALUES (
    p_truck_id, 
    CASE WHEN truck_record.is_overdue THEN 'OVERDUE' ELSE truck_record.status END,
    'ARRIVED', 
    p_user_id, 
    'Truck arrived ' || arrival_type,
    jsonb_build_object(
      'scheduled_date', truck_record.arrival_date,
      'actual_date', p_actual_arrival_date,
      'was_late', was_late,
      'days_late', CASE WHEN was_late THEN p_actual_arrival_date - truck_record.arrival_date ELSE 0 END,
      'late_reason', p_late_reason
    )
  );
  
  -- Create notification for late arrivals
  IF was_late THEN
    INSERT INTO public.truck_notifications (
      truck_id, notification_type, title, message, severity
    ) VALUES (
      p_truck_id, 
      'LATE_ARRIVAL', 
      'Late Arrival: ' || truck_record.license_plate,
      'Truck ' || truck_record.license_plate || ' arrived late on ' || p_actual_arrival_date || 
      ' (scheduled for ' || truck_record.arrival_date || ')' ||
      CASE WHEN p_late_reason IS NOT NULL THEN '. Reason: ' || p_late_reason ELSE '' END,
      'WARNING'
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get truck analytics
CREATE OR REPLACE FUNCTION public.get_truck_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_trucks INTEGER;
  overdue_trucks INTEGER;
  late_arrivals INTEGER;
  rescheduled_trucks INTEGER;
  avg_reschedules NUMERIC;
  on_time_percentage NUMERIC;
BEGIN
  -- Get basic metrics
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_overdue THEN 1 END) as overdue,
    COUNT(CASE WHEN actual_arrival_date > arrival_date THEN 1 END) as late,
    COUNT(CASE WHEN reschedule_count > 0 THEN 1 END) as rescheduled,
    AVG(reschedule_count) as avg_reschedule
  INTO total_trucks, overdue_trucks, late_arrivals, rescheduled_trucks, avg_reschedules
  FROM public.trucks 
  WHERE created_at::date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate on-time percentage
  on_time_percentage := CASE 
    WHEN total_trucks > 0 THEN 
      ((total_trucks - late_arrivals - overdue_trucks)::NUMERIC / total_trucks::NUMERIC) * 100 
    ELSE 0 
  END;
  
  result := jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'metrics', jsonb_build_object(
      'total_trucks', total_trucks,
      'overdue_trucks', overdue_trucks,
      'late_arrivals', late_arrivals,
      'rescheduled_trucks', rescheduled_trucks,
      'avg_reschedules_per_truck', ROUND(avg_reschedules, 2),
      'on_time_percentage', ROUND(on_time_percentage, 2)
    ),
    'generated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Create trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_truck_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if status actually changed
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.truck_status_history (
      truck_id, old_status, new_status, change_reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, 'Status updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS truck_status_change_trigger ON public.trucks;
CREATE TRIGGER truck_status_change_trigger
  AFTER UPDATE ON public.trucks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_truck_status_change();

-- Enable RLS on new tables
ALTER TABLE public.truck_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for truck_status_history
CREATE POLICY "Authenticated users can view truck status history" 
ON public.truck_status_history FOR SELECT 
TO authenticated USING (true);

-- RLS policies for truck_notifications
CREATE POLICY "Users can view relevant notifications" 
ON public.truck_notifications FOR SELECT 
TO authenticated 
USING (target_user_id IS NULL OR target_user_id = auth.uid());

CREATE POLICY "Admins can manage notifications" 
ON public.truck_notifications FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_truck_status_history_truck_id ON public.truck_status_history(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_status_history_created_at ON public.truck_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_truck_notifications_truck_id ON public.truck_notifications(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_notifications_type ON public.truck_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_truck_notifications_user ON public.truck_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_trucks_overdue ON public.trucks(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_trucks_arrival_tracking ON public.trucks(arrival_date, actual_arrival_date);

-- Schedule automatic overdue detection (runs every hour)
SELECT cron.schedule(
  'mark-overdue-trucks',
  '0 * * * *', -- Every hour
  'SELECT public.mark_overdue_trucks();'
);