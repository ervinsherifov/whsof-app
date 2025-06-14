-- Create work schedules table
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country_code TEXT DEFAULT 'US',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN is_holiday BOOLEAN DEFAULT false,
ADD COLUMN is_weekend BOOLEAN DEFAULT false,
ADD COLUMN overtime_reason TEXT[],
ADD COLUMN approved_by_user_id UUID,
ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN total_hours NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_schedules
CREATE POLICY "Users can view their own work schedule" 
ON public.work_schedules FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own work schedule" 
ON public.work_schedules FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all work schedules" 
ON public.work_schedules FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN'));

-- RLS policies for holidays
CREATE POLICY "Anyone can view holidays" 
ON public.holidays FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Admins can manage holidays" 
ON public.holidays FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN'));

-- Create smart hour calculation function
CREATE OR REPLACE FUNCTION public.calculate_work_hours(
  p_user_id UUID,
  p_check_in_time TIMESTAMP WITH TIME ZONE,
  p_check_out_time TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_hours NUMERIC;
  regular_hours NUMERIC := 0;
  overtime_hours NUMERIC := 0;
  work_date DATE;
  day_of_week INTEGER;
  is_holiday BOOLEAN := false;
  is_weekend BOOLEAN := false;
  is_working_day BOOLEAN := true;
  overtime_reasons TEXT[] := '{}';
  user_schedule RECORD;
BEGIN
  -- Calculate total hours
  total_hours := EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 3600.0;
  work_date := p_check_in_time::DATE;
  day_of_week := EXTRACT(DOW FROM work_date);
  
  -- Check if it's a weekend (Saturday=6, Sunday=0)
  IF day_of_week IN (0, 6) THEN
    is_weekend := true;
  END IF;
  
  -- Check if it's a holiday
  SELECT EXISTS(
    SELECT 1 FROM holidays 
    WHERE date = work_date AND is_active = true
  ) INTO is_holiday;
  
  -- Check user's work schedule
  SELECT * INTO user_schedule
  FROM work_schedules 
  WHERE user_id = p_user_id AND day_of_week = day_of_week;
  
  -- Determine if it's a working day
  IF user_schedule.id IS NOT NULL THEN
    is_working_day := user_schedule.is_working_day;
  ELSE
    -- Default: weekdays are working days, weekends are not
    is_working_day := (day_of_week BETWEEN 1 AND 5);
  END IF;
  
  -- Override working day if it's a holiday
  IF is_holiday THEN
    is_working_day := false;
  END IF;
  
  -- Calculate hours based on work day type
  IF NOT is_working_day THEN
    -- Weekend or holiday work = all overtime
    overtime_hours := total_hours;
    IF is_weekend THEN
      overtime_reasons := array_append(overtime_reasons, 'weekend');
    END IF;
    IF is_holiday THEN
      overtime_reasons := array_append(overtime_reasons, 'holiday');
    END IF;
  ELSE
    -- Regular work day: 8 hours standard, rest is overtime
    regular_hours := LEAST(total_hours, 8);
    overtime_hours := GREATEST(0, total_hours - 8);
    IF overtime_hours > 0 THEN
      overtime_reasons := array_append(overtime_reasons, 'daily_excess');
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'total_hours', total_hours,
    'regular_hours', regular_hours,
    'overtime_hours', overtime_hours,
    'is_weekend', is_weekend,
    'is_holiday', is_holiday,
    'overtime_reasons', overtime_reasons,
    'requires_approval', (overtime_hours > 0 AND (is_weekend OR is_holiday))
  );
END;
$$;

-- Create function to update time entry with calculated hours
CREATE OR REPLACE FUNCTION public.update_time_entry_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  calculated_hours JSONB;
BEGIN
  -- Only calculate if check_out_time is set
  IF NEW.check_out_time IS NOT NULL THEN
    SELECT public.calculate_work_hours(
      NEW.user_id,
      NEW.check_in_time,
      NEW.check_out_time
    ) INTO calculated_hours;
    
    -- Update the calculated fields
    NEW.total_hours := (calculated_hours->>'total_hours')::NUMERIC;
    NEW.regular_hours := (calculated_hours->>'regular_hours')::NUMERIC;
    NEW.overtime_hours := (calculated_hours->>'overtime_hours')::NUMERIC;
    NEW.is_weekend := (calculated_hours->>'is_weekend')::BOOLEAN;
    NEW.is_holiday := (calculated_hours->>'is_holiday')::BOOLEAN;
    NEW.overtime_reason := (calculated_hours->>'overtime_reasons')::TEXT[];
    
    -- Set approval status based on overtime type
    IF (calculated_hours->>'requires_approval')::BOOLEAN THEN
      NEW.approval_status := 'pending';
    ELSE
      NEW.approval_status := 'approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic hour calculation
CREATE TRIGGER calculate_time_entry_hours
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_time_entry_hours();

-- Insert default holidays for 2024-2025
INSERT INTO public.holidays (date, name, country_code) VALUES
('2024-01-01', 'New Year''s Day', 'US'),
('2024-07-04', 'Independence Day', 'US'),
('2024-11-28', 'Thanksgiving Day', 'US'),
('2024-12-25', 'Christmas Day', 'US'),
('2025-01-01', 'New Year''s Day', 'US'),
('2025-07-04', 'Independence Day', 'US'),
('2025-11-27', 'Thanksgiving Day', 'US'),
('2025-12-25', 'Christmas Day', 'US')
ON CONFLICT (date) DO NOTHING;