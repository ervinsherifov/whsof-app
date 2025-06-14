import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WorkSchedule {
  id: string;
  day_of_week: number;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  country_code: string;
  is_active: boolean;
}

export const useWorkSchedule = () => {
  const { user } = useAuth();
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkSchedule = async () => {
    if (!user?.id) return;

    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week');

      if (scheduleError) throw scheduleError;
      setWorkSchedule(scheduleData || []);

      const { data: holidayData, error: holidayError } = await supabase
        .from('holidays')
        .select('*')
        .eq('is_active', true)
        .order('date');

      if (holidayError) throw holidayError;
      setHolidays(holidayData || []);
    } catch (error) {
      console.error('Error fetching work schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkSchedule();
  }, [user?.id]);

  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];
    
    // Check if it's a holiday
    const isHoliday = holidays.some(h => h.date === dateString);
    if (isHoliday) return false;

    // Check user's work schedule
    const daySchedule = workSchedule.find(s => s.day_of_week === dayOfWeek);
    return daySchedule?.is_working_day ?? (dayOfWeek >= 1 && dayOfWeek <= 5);
  };

  const isHoliday = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    return holidays.some(h => h.date === dateString);
  };

  const getHolidayName = (date: Date): string | null => {
    const dateString = date.toISOString().split('T')[0];
    const holiday = holidays.find(h => h.date === dateString);
    return holiday?.name || null;
  };

  const isWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  return {
    workSchedule,
    holidays,
    isLoading,
    isWorkingDay,
    isHoliday,
    getHolidayName,
    isWeekend,
    refreshSchedule: fetchWorkSchedule
  };
};