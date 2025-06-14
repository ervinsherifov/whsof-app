-- Create default work schedules for existing users using a simpler approach
DO $$
DECLARE
  user_record RECORD;
  day_num INTEGER;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM public.user_roles LOOP
    FOR day_num IN 0..6 LOOP
      INSERT INTO public.work_schedules (user_id, day_of_week, is_working_day, start_time, end_time)
      VALUES (
        user_record.user_id,
        day_num,
        CASE WHEN day_num IN (0, 6) THEN false ELSE true END,
        CASE WHEN day_num IN (0, 6) THEN NULL ELSE '09:00'::TIME END,
        CASE WHEN day_num IN (0, 6) THEN NULL ELSE '17:00'::TIME END
      )
      ON CONFLICT (user_id, day_of_week) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Add updated_at triggers
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_work_schedules_user_id ON public.work_schedules(user_id);
CREATE INDEX idx_work_schedules_day_of_week ON public.work_schedules(day_of_week);
CREATE INDEX idx_holidays_date ON public.holidays(date);
CREATE INDEX idx_holidays_active ON public.holidays(is_active);
CREATE INDEX idx_time_entries_approval_status ON public.time_entries(approval_status);
CREATE INDEX idx_time_entries_weekend_holiday ON public.time_entries(is_weekend, is_holiday);